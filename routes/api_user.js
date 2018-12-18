import express from 'express'

import User from '../models/user'
import Recipe from '../models/recipe'
import Ingredient from '../models/ingredients'

const router = express.Router()

router.get('/profile/me', function(req, res) {
    res.json(req.user)
})

router.get('/savedrecipes', function(req, res) {
    res.json(req.user.savedRecipes)
})

router.get('/save/recipe/:recipeID', function(req, res) {
    Recipe.findById(req.params.recipeID).exec(async function(err, recipe) {
        if(err || !recipe) {
            res.status(404).json({message: "Recipe not found"})
            return
        }

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

router.post('/shoppinglist/item', function(req, res) {
    Ingredient.findById(req.body.ingredientID).exec(async function(err, ingredient) {
        if(err || !ingredient) {
            res.status(422).json({message: "Ingredient not found"})
            return
        }

        req.user.shoppingList.push({
            ingredientID: req.body.ingredientID,
            quantity: req.body.quantity,
            unit: req.body.unit
        })
        const user = await req.user.save()
        res.json({_id: user.shoppingList[user.shoppingList.length-1]._id})
    })
})

router.delete('/shoppinglist/item/:itemID', function(req, res) {
    User.findByIdAndUpdate(req.user._id,
        { $pull: { "shoppingList": {"_id": req.params.itemID}}}, {'new': true}
    ).exec(function(err, user) {
        if (err || !user) {
            res.status(404).json({message: "Item not found"})
            return
        }
        res.json({message: "Item removed"})
    })
})

router.get('/fridge', function(req, res) {
    res.json(req.user.fridge)
})

router.post('/fridge/item', function(req, res) {
    Ingredient.findById(req.body.ingredientID).exec(async function(err, ingredient) {
        if(err || !ingredient) {
            res.status(422).json({message: "Ingredient not found"})
            return
        }

        req.user.shoppingList.push({
            ingredientID: req.body.ingredientID,
            quantity: req.body.quantity,
            unit: req.body.unit,
            expirationDate: req.body.expirationDate
        })
        const user = await req.user.save()
        res.json({_id: user.shoppingList[user.shoppingList.length-1]._id})
    })
})

router.delete('/fridge/item/:itemID', function(req, res) {
    User.findByIdAndUpdate(req.user._id,
        { $pull: { "shoppingList": {"_id": req.params.itemID}}}, {'new': true}
    ).exec(function(err, user) {
        if (err || !user) {
            res.status(404).json({message: "Item not found"})
            return
        }
        res.json({message: "Item removed"})
    })
})

export default router