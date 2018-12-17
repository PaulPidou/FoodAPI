import express from 'express'

import Recipe from '../models/recipe'

const router = express.Router()

router.get('/profile/me', function(req, res) {
    res.json(req.user)
})

router.get('/savedrecipes', function(req, res) {
    res.json(req.user.savedRecipes)
})

router.get('/save/recipe/:recipeID', async function(req, res) {
    await Recipe.findById(req.params.recipeID).exec(function(err, recipe) {
        if(err || !recipe) {
            return res.status(404).json({message: "Recipe not found"})
        }
    })
    req.user.savedRecipes.push({
        recipeID: req.params.recipeID,
        savingDate: Date.now()
    })
    await req.user.save()
    res.json({message: "Recipe saved"})
})

router.delete('/savedrecipes/:recipeID', function(req, res) {
    res.send()
})

router.get('/shoppinglist', function(req, res) {
    res.json(req.user.shoppingList)
})

router.post('/shoppinglist/:item', function(req, res) {
    res.json({})
})

router.delete('/shoppinglist/item/:item', function(req, res) {
    res.json({})
})

router.get('/fridge', function(req, res) {
    res.json(req.user.fridge)
})

router.post('/fridge/:item', function(req, res) {
    res.json({})
})

router.delete('/fridge/item/:item', function(req, res) {
    res.json({})
})

export default router