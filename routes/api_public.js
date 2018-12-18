import express from 'express'
import passport from 'passport'
import jwt from 'jsonwebtoken'

import User from '../models/user'
import Recipe from '../models/recipe'
import Ingredient from '../models/ingredients'

import {getRecipesByIngredients} from './utils'

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

router.post('/recipes/summary', function(req, res) {
    Recipe.find({_id: { $in: req.body.recipes}}).select(
        {"title": 1, "budget": 1, "difficulty": 1, "totalTime": 1}).exec(function(err, recipes) {
        if(err || !recipes) {
            res.status(404).send("Recipes not found")
            return
        }
        res.json(recipes)
    })
})

router.post('/recipes/by/keywords', function(req, res) {
    // Need elastic search
    res.json([])
})

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
            res.status(403).json({message: 'User already exists'})
            return
        }
        res.json({'message': 'Registration succeeded'})
    })
})

router.post('/login', function(req, res, next) {
    passport.authenticate('local', {session: false}, (err, user) => {
        if (err || !user) {
            res.status(400).json({message: 'Bad  email or password'})
            return
        }

        req.login(user, {session: false}, (err) => {
            user = user.toJSON()
            if (err) {
                res.status(400).json({message: 'Bad request'})
                return
            }
            const token = jwt.sign({email: user.email}, config.secret)
            res.json({token})
        })
    })(req, res, next)
})

export default router