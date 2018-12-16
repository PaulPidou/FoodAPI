import express from 'express'
import passport from 'passport'
import jwt from 'jsonwebtoken'

import User from '../models/user'
import Recipe from '../models/recipe'
import Ingredient from '../models/ingredients'

import config from '../config'

const router = express.Router()

router.get('/recipe/:recipeID', function(req, res) {
    Recipe.findById(req.params.recipeID).exec(function(err, recipe) {
        if(err || !recipe) {
            res.status(404).send("Recipe not found")
            return
        }
        res.json(recipe)
    })
})

router.post('/recipes/by/keywords', function(req, res) {
    res.json([])
})

const getRecipesByIngredients = async function(ingredientIDs) {
    // next step do TF-IDF
    let recipes = {}
    for (const id of ingredientIDs) {
        const ingredient = await Ingredient.findById(id).exec()
        if(ingredient) {
            for (const recipe of ingredient.recipes) {
                if (!recipes.hasOwnProperty(recipe)) {
                    recipes[recipe] = 0
                }
                recipes[recipe]++
            }
        }
    }
    let sortable = []
    for (const recipe in recipes) {
        sortable.push([recipe, recipes[recipe]])
    }
    return sortable.sort(function(a, b) { return b[1] - a[1] })
}

router.post('/recipes/by/ingredients', async function(req, res) {
    const recipes = await getRecipesByIngredients(req.body.ingredients)
    res.json(recipes)
})

router.get('/ingredient/:ingredientID', function(req, res) {
    Ingredient.findById(req.params.ingredientID).exec(function(err, ingredient) {
        if(err || !ingredient) {
            res.status(404).send("Ingredient not found")
            return
        }
        res.json(ingredient)
    })
})

router.get('/ingredient/by/name/:name', function(req, res) {
    Ingredient.findOne({name: req.params.name}).exec(function(err, ingredient) {
        if(err || !ingredient) {
            res.status(404).send("Ingredient not found")
            return
        }
        res.json(ingredient)
    })
})

router.post('/register', function(req, res) {
    User.register(new User({ email : req.body.email, password: req.body.password }), req.body.password, function(err, user) {
        if(!user) {
            return res.status(403).json({
                message: 'User already exists'
            })
        }
        res.json({'message': 'Registration succeeded'})
    })
})

router.post('/login', function(req, res, next) {
    passport.authenticate('local', {session: false}, (err, user) => {
        if (err || !user) {
            return res.status(400).json({
                message: 'Bad  email or password'
            })
        }

        req.login(user, {session: false}, (err) => {
            user = user.toJSON()
            if (err) {
                return res.status(400).json({
                    message: 'Bad request'
                })
            }
            const token = jwt.sign({email: user.email}, config.secret)
            res.json({token})
        })
    })(req, res, next)
})

export default router