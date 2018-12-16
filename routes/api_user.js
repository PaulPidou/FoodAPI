import express from 'express'

const router = express.Router()

router.get('/profile/me', function(req, res) {
    res.json(req.user)
})

router.get('/savedrecipes', function(req, res) {
    res.json([])
})

router.get('/save/recipe/:recipeID', function(req, res) {
    res.json([])
})

router.delete('/savedrecipes/:recipeID', function(req, res) {
    res.send()
})

router.get('/shoppinglist', function(req, res) {
    res.json({})
})

router.post('/shoppinglist/:item', function(req, res) {
    res.json({})
})

router.delete('/shoppinglist/item/:item', function(req, res) {
    res.json({})
})

router.get('/fridge', function(req, res) {
    res.json({})
})

router.post('/fridge/:item', function(req, res) {
    res.json({})
})

router.delete('/fridge/item/:item', function(req, res) {
    res.json({})
})

export default router