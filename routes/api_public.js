import express from 'express'
import passport from 'passport'
import jwt from 'jsonwebtoken'

import User from '../models/user'
import Recipe from '../models/recipe'
import Ingredient from '../models/ingredients'

import { getRecipesByIngredients } from './utils'

import config from '../config'

const router = express.Router()

router.get('/recipe/:recipeID', function(req, res) {
    Recipe.findById(req.params.recipeID).exec(function(err, recipe) {
        if(err || !recipe) {
            res.status(404).json({message: "Recipe not found"})
            return
        }
        res.json(recipe)
    })
})

router.post('/recipes/summary', function(req, res) {
    Recipe.find({_id: { $in: req.body.recipes}}).select(
        {"title": 1, "budget": 1, "picture": 1, "difficulty": 1, "totalTime": 1, 'ingredients.ingredientID': 1,
            'ingredients.quantity': 1, 'ingredients.unit': 1}).exec(function(err, recipes) {
        if(err || !recipes) {
            res.status(404).json({message: "Recipes not found"})
            return
        }
        res.json(recipes)
    })
})

router.get('/recipes/by/fame', function(req, res) {
    Recipe.find({}).select(
        {"title": 1, "budget": 1, "picture": 1, "difficulty": 1, 'fame': 1, "totalTime": 1,
            'ingredients.ingredientID': 1, 'ingredients.quantity': 1, 'ingredients.unit': 1})
        .sort({'fame': -1}).limit(100).exec(function(err, recipes) {
            if(err || !recipes) {
                res.status(404).json({message: "Recipes not found"})
                return
            }
        res.json(recipes)
    })
})

router.post('/recipes/by/keywords', function(req, res) {
    Recipe.search({ query_string: { query: req.body.keywords }}, function(err, results) {
        if(err || !results || results.hits.total === 0) {
            res.json([])
            return
        }

        let recipeIDs = []
        let scoreCache = {}
        for(const recipe of results.hits.hits) {
            recipeIDs.push(recipe._id)
            scoreCache[recipe._id] = recipe._score
        }

        Recipe.find({_id: { $in: recipeIDs}}).select(
            {"title": 1, "budget": 1, "picture": 1, "difficulty": 1, "totalTime": 1, 'ingredients.ingredientID': 1,
                'ingredients.quantity': 1, 'ingredients.unit': 1}).exec(function(err, recipes) {
            if(err || !recipes) {
                res.json([])
                return
            }
            res.json(
                recipes.map((recipe) => {
                    return {
                        _id: recipe._id,
                        title: recipe.title,
                        budget: recipe.budget,
                        picture: recipe.picture,
                        difficulty: recipe.difficulty,
                        totalTime: recipe.totalTime,
                        ingredients: recipe.ingredients,
                        score: scoreCache[recipe._id]
                    }
                }))
        })
    })
})

router.post('/recipes/by/ingredients', async function(req, res) {
    const recipes = await getRecipesByIngredients(req.body.ingredients)
    res.json(recipes)
})

router.get('/ingredients', function(req, res) {
    Ingredient.aggregate([{
            $project : {
                name : 1,
                picture: 1,
                fame: { $size: '$recipes' }
            }
        }, { $sort: { name: 1 } }]).exec(function(err, ingredients) {
            if(err || !ingredients) {
                res.status(404).json({message: "Ingredients not found"})
                return
            }
            res.json(ingredients)
        })

    /*
    Ingredient.find({}).select({'name': 1, 'picture': 1}).sort('name').exec(function(err, ingredients) {
        if(err || !ingredients) {
            res.status(404).json({message: "Ingredients not found"})
            return
        }
        res.json(ingredients)
    })
    */
})

router.get('/ingredient/:ingredientID', function(req, res) {
    Ingredient.findById(req.params.ingredientID).exec(function(err, ingredient) {
        if(err || !ingredient) {
            res.status(404).json({message: "Ingredient not found"})
            return
        }
        res.json(ingredient)
    })
})

router.get('/ingredient/by/name/:name', function(req, res) {
    Ingredient.findOne({name: req.params.name}).exec(function(err, ingredient) {
        if(err || !ingredient) {
            res.status(404).json({message: "Ingredient not found"})
            return
        }
        res.json(ingredient)
    })
})

router.get('/ingredients/by/autocompletion/:term', function(req, res) {
    const regex = new RegExp('^' + req.params.term)
    Ingredient.find({name: regex}, {name: 1}).exec(function(err, ingredients) {
        if(err || !ingredients) {
            res.json([])
            return
        }
        res.json(ingredients)
    })
})

router.post('/register', function(req, res) {
    User.register(new User({ email : req.body.email, password: req.body.password }), req.body.password, function(err, user) {
        if(!user) {
            res.status(403).json({message: 'User already exists'})
            return
        }
        res.json({message: 'Registration succeeded'})
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
            res.json({token: token})
        })
    })(req, res, next)
})

export default router