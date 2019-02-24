import Ingredient from "../models/ingredients"
import Recipe from "../models/recipe"

exports.checkIfIngredientsExist = function(req, res, next) {
    let ids = req.params.ingredients ? req.params.ingredients.split(',') : req.body.ingredients

    if(!ids.length) {
        res.status(422).json({message: "Invalid input"})
        return
    }

    if (typeof ids[0] === 'object') { ids = ids.map(item => item.ingredientID) }

    Ingredient.find({_id: { $in: ids }}).exec(function(err, ingredients) {
        if(err || !ingredients) {
            res.status(404).json({message: "Ingredients not found"})
            return
        }
        res.locals.ingredients = ingredients
        return next()
    })
}

exports.checkIfRecipesExist = function(req, res, next) {
    const ids = req.params.recipes ? req.params.recipes.split(',') : req.body.recipes

    if(!ids.length) {
        res.status(422).json({ message: "Invalid input" })
        return
    }

    Recipe.find({_id: { $in: ids }}).exec(function(err, recipes) {
        if(err || !recipes) {
            res.status(404).json({ message: "Recipes not found" })
            return
        }
        res.locals.recipes = recipes
        return next()
    })
}