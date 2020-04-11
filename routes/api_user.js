import express from 'express'

import Recipe from "../models/recipe"
import { checkIfIngredientsExist, checkIfRecipesExist } from '../middlewares/checkExistence'
import { saveRecipes, removeRecipes, addItemsToShoppingList, addItemsToFridge, removeItemsFromShoppingList,
    removeItemsFromFridge, getItemsFromShoppingList, getItemsFromFridge, handleListDependencies, removeCookedIngredients
} from '../utils/user'
import { getCorrespondingItem } from './utils'
import mongoose from "mongoose";

const router = express.Router()

router.get('/profile/me', function(req, res) {
    res.json(req.user)
})

router.post('/parameters', async function(req, res) {
    const parameters = req.body.parameters

    if(!(typeof parameters === 'object')) {
        res.status(400).json({message: 'Bad request'})
    }

    if(Object.keys(parameters).every(x => Object.keys(req.user.parameters.toJSON()).includes(x))) {
        for(const parameter in parameters) {
            req.user.parameters[parameter] = parameters[parameter]
        }
        await req.user.save()
        res.json({message: 'Parameters saved'})
    } else {
        res.status(400).json({message: 'Bad request'})
    }

})

router.get('/lists', function(req, res) {
    const user = req.user.toJSON()

    delete user._id
    delete user.email
    delete user.isAdmin
    delete user.parameters

    const recipeIDs = user.savedRecipes.map(item => item.recipeID)
    Recipe.find({_id: { $in: recipeIDs}}).select(
        {"title": 1, "budget": 1, "picture": 1, "difficulty": 1, "totalTime": 1, 'ingredients.ingredientID': 1,
            'ingredients.quantity': 1, 'ingredients.unit': 1}).exec(function(err, recipes) {
        if(err || !recipes) {
            user.savedRecipes = []
        }
        user.savedRecipes = recipes
        res.json(user)
    })
})

router.get('/savedrecipes', function(req, res) {
    const recipeIDs = req.user.savedRecipes.map(item => item.recipeID)
    Recipe.find({_id: { $in: recipeIDs}}).select(
        {"title": 1, "budget": 1, "picture": 1, "difficulty": 1, "totalTime": 1, 'ingredients.ingredientID': 1,
            'ingredients.quantity': 1, 'ingredients.unit': 1}).exec(function(err, recipes) {
        if(err || !recipes) {
            res.status(404).json({message: "Recipes not found"})
            return
        }
        res.json(recipes)
    })
})

router.post('/save/recipes', checkIfRecipesExist, async function(req, res) {
    const savedRecipeIDs = req.user.savedRecipes.map(item => item.recipeID.toString())
    const recipesToSave = res.locals.recipes.map(item => item._id.toString())
        .filter(item => !savedRecipeIDs.includes(item))

    const msgBegin = res.locals.recipes.length === 1 ? 'Recipe' : 'Recipes'
    if (!recipesToSave.length) {
        res.status(403).json({ message: `${msgBegin} already saved` })
        return
    }

    if(req.user.parameters.keepFoodListsIndependent) {
        await saveRecipes(req.user, recipesToSave)
    } else {
        await handleListDependencies(req.user, 'SAVE_RECIPES', recipesToSave)
    }
    res.json({message: `${msgBegin} saved`})
})

router.post('/savedrecipes/delete/recipes', async function(req, res) {
    const msgBegin = req.body.recipes.length === 1 ? 'Recipe' : 'Recipes'
    let bool = null
    if(req.user.parameters.keepFoodListsIndependent) {
        bool = await removeRecipes(req.user._id, req.body.recipes)
    } else {
        bool = await handleListDependencies(req.user, 'REMOVE_RECIPES', req.body.recipes)
    }
    bool ? res.json({ message: `${msgBegin}  removed` }) : res.status(404).json({ message: `${msgBegin}  not found` })
})

router.post('/savedrecipes/cook/recipes', async function(req, res) {
    const msgBegin = req.body.recipes.length === 1 ? 'Recipe' : 'Recipes'
    const bool = await removeRecipes(req.user._id, req.body.recipes)
    await removeCookedIngredients(req.user, req.body.recipes)
    bool ? res.json({ message: `${msgBegin}  removed` }) : res.status(404).json({ message: `${msgBegin}  not found` })
})

router.get('/shoppinglist', function(req, res) {
    res.json(req.user.shoppingList)
})

router.post('/shoppinglist/items', checkIfIngredientsExist, async function(req, res) {
    let items = []
    for(const ingredient of res.locals.ingredients) {
        const item = getCorrespondingItem(req.body.ingredients, ingredient._id.toString())
        const itemToSave = {
            ingredientID: item.ingredientID,
            ingredientName: ingredient.name,
            quantity: item.quantity,
            unit: item.unit
        }
        items.push(itemToSave)
    }
    await addItemsToShoppingList(req.user, items)
    res.json({ message: 'Items saved' })
})

router.post('/shoppinglist/update/item/', async function(req, res) {
    let newShoppingList = []
    for(const item of req.user.shoppingList) {
        if(req.body.item.ingredientID === item.ingredientID.toString()) {
            newShoppingList.push({
                ingredientID: item.ingredientID,
                ingredientName: item.ingredientName,
                quantities: req.body.item.quantities,
                associatedProduct: req.body.item.associatedProduct
            })
        } else {
            newShoppingList.push(item)
        }
    }
    req.user.shoppingList = newShoppingList
    await req.user.save()
    res.json({ message: 'Item updated' })
})

router.post('/shoppinglist/items/from/recipes', checkIfRecipesExist, async function(req, res) {
    let itemsToAdd = []
    for(const recipe of res.locals.recipes) {
        const items = recipe.ingredients.map((ingredient) => {
            return {
                ingredientID: ingredient.ingredientID,
                ingredientName: ingredient.ingredientName,
                quantity: ingredient.quantity,
                unit: ingredient.unit
        }})
        itemsToAdd.push(...items)
    }
    await addItemsToShoppingList(req.user, itemsToAdd)
    res.json({ message: 'Items saved' })
})

router.post('/shoppinglist/delete/items', async function(req, res) {
    const bool = await removeItemsFromShoppingList(req.user._id, req.body.items)
    bool ? res.json({ message: "Items removed" }) : res.status(404).json({ message: "Items not found" })
})

router.get('/fridge', function(req, res) {
    res.json(req.user.fridge)
})

router.post('/fridge/items', checkIfIngredientsExist, async function(req, res) {
    let items = []
    for(const ingredient of res.locals.ingredients) {
        const item = getCorrespondingItem(req.body.ingredients, ingredient._id.toString())
        const itemToSave = {
            ingredientID: item.ingredientID,
            ingredientName: ingredient.name,
            quantity: item.quantity,
            unit: item.unit,
            expirationDate: item.expirationDate
        }
        items.push(itemToSave)
    }
    if(req.user.parameters.keepFoodListsIndependent) {
        await addItemsToFridge(req.user, items)
    } else {
        await handleListDependencies(req.user, 'ADD_ITEMS_TO_FRIDGE', items)
    }
    res.json({ message: 'Items saved' })
})

router.post('/fridge/update/item', async function(req, res) {
    let newFridge = []
    for(const item of req.user.fridge) {
        if(req.body.item.ingredientID === item.ingredientID.toString()) {
            newFridge.push({
                ingredientID: item.ingredientID,
                ingredientName: item.ingredientName,
                quantities: req.body.item.quantities,
                expirationDate: req.body.item.expirationDate
            })
        } else {
            newFridge.push(item)
        }
    }
    req.user.fridge = newFridge
    await req.user.save()
    res.json({ message: 'Item updated' })
})

router.post('/fridge/delete/items', async function(req, res) {
    const bool = req.user.parameters.keepFoodListsIndependent ?
        await removeItemsFromFridge(req.user._id, req.body.items) :
        await handleListDependencies(req.user, 'REMOVE_ITEMS_FROM_FRIDGE', req.body.items)
    bool ? res.json({message: "Items removed"}) : res.status(404).json({message: "Items not found"})
})

router.post('/move/items/from/shoppinglist/to/fridge', async function(req, res) {
    const items = getItemsFromShoppingList(req.user, req.body.items)
    if(!items || !items.length) {
        res.status(404).json({message: "Items not found"})
        return
    }
    await removeItemsFromShoppingList(req.user._id, req.body.items)
    await addItemsToFridge(req.user, items)
    res.json({message: "Items moved"})
})

router.post('/move/items/from/fridge/to/shoppinglist', async function(req, res) {
    const items = getItemsFromFridge(req.user, req.body.items)
    if(!items || !items.length) {
        res.status(404).json({message: "Items not found"})
        return
    }
    await removeItemsFromFridge(req.user._id, req.body.items)
    await addItemsToShoppingList(req.user, items)
    res.json({message: "Items moved"})
})

export default router