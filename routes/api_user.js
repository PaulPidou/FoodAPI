import express from 'express'

import User from '../models/user'
import {checkIfIngredientExist, checkIfRecipeExist} from '../middlewares/checkExistence'
import {addItemToShoppingList, addItemToFridge,
    removeItemFromShoppingList, removeItemFromFridge,
    getItemFromShoppingList, getItemFromFridge} from '../utils/user'

const router = express.Router()

router.get('/profile/me', function(req, res) {
    res.json(req.user)
})

router.get('/savedrecipes', function(req, res) {
    res.json(req.user.savedRecipes)
})

router.get('/save/recipe/:recipeID', checkIfRecipeExist, async function(req, res) {
    for (const recipe of req.user.savedRecipes) {
        if (recipe.recipeID.toString() === req.params.recipeID) {
            res.status(403).json({message: "Recipe already saved"})
            return
        }
    }

    req.user.savedRecipes.push({
        recipeID: req.params.recipeID,
        savingDate: Date.now()
    })
    await req.user.save()
    res.json({message: "Recipe saved"})
})

router.delete('/savedrecipes/:recipeID', async function(req, res) {
    User.findByIdAndUpdate(req.user._id,
        { $pull: { "savedRecipes": {"recipeID": req.params.recipeID}}}, {'new': true}
        ).exec(function(err, user) {
            if (err || !user) {
                res.status(404).json({message: "Recipe not found"})
                return
            }
        res.json({message: "Recipe removed"})
    })
})

router.get('/shoppinglist', function(req, res) {
    res.json(req.user.shoppingList)
})

router.post('/shoppinglist/item', checkIfIngredientExist, async function(req, res) {
    const item = {
        ingredientID: req.body.ingredientID,
        ingredientName: res.locals.ingredient.name,
        quantity: req.body.quantity,
        unit: req.body.unit
    }
    const id = await addItemToShoppingList(req.user, item)
    res.json({_id: id})
})

router.delete('/shoppinglist/item/:itemID', async function(req, res) {
    const bool = await removeItemFromShoppingList(req.user._id, req.params.itemID)
    bool ? res.json({message: "Item removed"}) : res.status(404).json({message: "Item not found"})
})

router.get('/fridge', function(req, res) {
    res.json(req.user.fridge)
})

router.post('/fridge/item', checkIfIngredientExist, async function(req, res) {
    const item = {
        ingredientID: req.body.ingredientID,
        ingredientName: res.locals.ingredient.name,
        quantity: req.body.quantity,
        unit: req.body.unit,
        expirationDate: req.body.expirationDate
    }
    const id = await addItemToFridge(req.user, item)
    res.json({_id: id})
})

router.delete('/fridge/item/:itemID', async function(req, res) {
    const bool = await removeItemFromFridge(req.user._id, req.params.itemID)
    bool ? res.json({message: "Item removed"}) : res.status(404).json({message: "Item not found"})
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