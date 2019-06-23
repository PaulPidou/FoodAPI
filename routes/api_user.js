import express from 'express'

import User from '../models/user'
import Recipe from "../models/recipe"
import {checkIfIngredientsExist, checkIfRecipesExist} from '../middlewares/checkExistence'
import {addItemsToShoppingList, addItemsToFridge, removeItemsFromShoppingList, removeItemsFromFridge,
    getItemsFromShoppingList, getItemsFromFridge, saveRecipesWithIngredients} from '../utils/user'
import { getCorrespondingItem } from './utils'

const router = express.Router()

router.get('/profile/me', function(req, res) {
    res.json(req.user)
})

router.get('/lists', function(req, res) {
    const user = JSON.parse(JSON.stringify(req.user))

    delete user._id
    delete user.email
    delete user.isAdmin

    const recipeIDs = user.savedRecipes.map(item => item.recipeID)
    Recipe.find({_id: { $in: recipeIDs}}).select(
        {"title": 1, "budget": 1, "difficulty": 1, "totalTime": 1}).exec(function(err, recipes) {
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
        {"title": 1, "budget": 1, "difficulty": 1, "totalTime": 1}).exec(function(err, recipes) {
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

    const keepFoodListIndependent = false // TO DO: Add this to the user's parameters

    if(keepFoodListIndependent) {
        for (const recipeID of recipesToSave) {
            req.user.savedRecipes.push({
                recipeID: recipeID,
                savingDate: Date.now()
            })
        }
        await req.user.save()
    } else {
        await saveRecipesWithIngredients(req.user, recipesToSave)
    }
    res.json({message: `${msgBegin} saved`})
})

router.post('/savedrecipes/delete/recipes', async function(req, res) {
    const msgBegin = req.body.recipes.length === 1 ? 'Recipe' : 'Recipes'
    User.findByIdAndUpdate(req.user._id,
        { $pull: { "savedRecipes": {"recipeID": {$in: req.body.recipes}}}}, {'multi': true, 'new': true}
        ).exec(function(err, user) {
            if (err || !user) {
                res.status(404).json({ message: `${msgBegin}  not found` })
                return
            }
        res.json({ message: `${msgBegin}  removed` })
    })
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

router.post('/shoppinglist/items/from/recipes', checkIfRecipesExist, async function(req, res) {
    let itemsToAdd = []
    for(const recipe of res.locals.recipes) {
        const items = recipe.ingredients.map((ingredient) => {
            return {
                ingredientID: ingredient.ingredientID,
                ingredientName: ingredient.ingredient,
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
    await addItemsToFridge(req.user, items)
    res.json({ message: 'Items saved' })
})

router.post('/fridge/delete/items', async function(req, res) {
    const bool = await removeItemsFromFridge(req.user._id, req.body.items)
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