import express from 'express'

import User from '../models/user'
import Recipe from "../models/recipe"
import {checkIfIngredientsExist, checkIfRecipesExist} from '../middlewares/checkExistence'
import {addItemsToShoppingList, addItemsToFridge, removeItemsFromShoppingList, removeItemsFromFridge,
    getItemFromShoppingList, getItemFromFridge} from '../utils/user'
import { getCorrespondingItem } from './utils'

const router = express.Router()

router.get('/profile/me', function(req, res) {
    res.json(req.user)
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

    if (!recipesToSave.length) {
        res.status(403).json({message: "Recipes already saved"})
        return
    }

    for(const recipeID of recipesToSave) {
        req.user.savedRecipes.push({
            recipeID: recipeID,
            savingDate: Date.now()
        })
    }
    await req.user.save()
    res.json({message: "Recipes saved"})
})

router.post('/savedrecipes/delete/recipes', async function(req, res) {
    User.findByIdAndUpdate(req.user._id,
        { $pull: { "savedRecipes": {"recipeID": {$in: req.body.recipes}}}}, {'multi': true, 'new': true}
        ).exec(function(err, user) {
            if (err || !user) {
                res.status(404).json({message: "Recipes not found"})
                return
            }
        res.json({message: "Recipes removed"})
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

router.get('/move/item/:itemID/from/shoppinglist/to/fridge', async function(req, res) {
    const item = getItemFromShoppingList(req.user, req.params.itemID)
    if(!item) {
        res.status(404).json({message: "Item not found"})
        return
    }
    await removeItemFromShoppingList(req.user._id, req.params.itemID)
    const id = await addItemToFridge(req.user, item)
    res.json({_id: id})
})

router.get('/move/item/:itemID/from/fridge/to/shoppinglist', async function(req, res) {
    const item = getItemFromFridge(req.user, req.params.itemID)
    if(!item) {
        res.status(404).json({message: "Item not found"})
        return
    }
    await removeItemFromFridge(req.user._id, req.params.itemID)
    const id = await addItemToShoppingList(req.user, item)
    res.json({_id: id})
})

export default router