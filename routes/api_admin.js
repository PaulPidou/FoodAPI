import express from "express"
import User from '../models/user'
import Recipe from '../models/recipe'
import Ingredient from "../models/ingredients"
import Product from "../models/product"

import { checkIfRecipesExist, checkIfIngredientsExist,
    checkIfIngredientsAndSubstitutesExist, checkIfProductIngredientsExist } from '../middlewares/checkExistence'

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
        res.json({ message: "Recipes removed" })
    })
})

router.post('/ingredients/update/substitutes', checkIfIngredientsAndSubstitutesExist, async function(req, res) {
    for(const ingredient of res.locals.ingredients) {
        await Ingredient.updateOne({ _id: ingredient.ingredientID }, {
            substitutes: ingredient.substitutes
        }).exec()
    }
    res.json({ message: "Ingredients updated" })
})

router.post('/ingredients/update/season', checkIfIngredientsExist, async function(req, res) {
    for(const ingredient of req.body.ingredients) {
        await Ingredient.updateOne({ _id: ingredient.ingredientID }, {
            season: ingredient.season
        }).exec()
    }
    res.json({ message: "Ingredients updated" })
})

router.post('/products', checkIfProductIngredientsExist, async function(req, res) {
    for(const product of req.body.products) {
        await new Product({
            name: product.name,
            picture: product.picture ? product.picture : undefined,
            brand: product.brand,
            nutriscore: product.nutriscore ? product.nutriscore : undefined,
            novaGroup: product.novaGroup ? product.novaGroup : undefined,
            OFFUrl: product.OFFUrl,
            ingredient: product.ingredientID
        }).save()
    }
    res.json({ message: "Products saved" })
})

export default router