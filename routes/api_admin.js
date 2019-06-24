import express from "express"
import User from '../models/user'
import Recipe from '../models/recipe'

import {checkIfRecipesExist} from '../middlewares/checkExistence'

const router = express.Router()

router.get('/set/user/:user/admin', function(req, res) {
    User.findByIdAndUpdate(req.params.user, { isAdmin: true }, {'new': true}).exec(function (err, user) {
        if(err || !user) {
            res.status(403).json({message: err.message})
            return
        }
        res.json({message: "User set as admin"})
    })
})

router.post('/recipe', function(req, res) {
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
            res.status(403).json({message: err.message})
            return
        }
        res.json(recipe._id)
    })
})

router.delete('/recipes', checkIfRecipesExist, function(req, res) {
    Recipe.deleteMany({_id: { $in: res.locals.recipes}}, function(err) {
        if(err) {
            res.status(403).json({message: err.message})
            return
        }
        res.json({message: "Recipes removed"})
    })
})

export default router