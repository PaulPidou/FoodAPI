import express from "express"
import Recipe from '../models/recipe'

const router = express.Router()

router.get('/set/user/:user/admin', function(req, res) {
    res.json([])
})

router.post('/add/recipe', function(req, res) {
    const recipe = new Recipe({
        title: req.body.title,
        author: req.body.author,
        budget: req.body.budget,
        difficulty: req.body.difficulty,
        recipeQuantity: req.body.recipeQuantity,
        totalTime: req.body.totalTime,
        timingDetails: req.body.timingDetails,
        tags: req.body.tags,
        fame: req.body.fame,
        picture: req.body.picture,
        ingredients: req.body.ingredients,
        utensils: req.body.utensils,
        recipe: req.body.recipe
    })
    recipe.save((err, recipe) => {
        if(err) {
            res.status(403).json({
                message: err.message
            })
            return
        }
        res.json(recipe._id)
    })
})

export default router