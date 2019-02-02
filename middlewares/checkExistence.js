import Ingredient from "../models/ingredients"
import Recipe from "../models/recipe"

exports.checkIfIngredientExist = function(req, res, next) {
    const id = req.params.ingredientID ? req.params.ingredientID : req.body.ingredientID
    Ingredient.findById(id).exec(async function(err, ingredient) {
        if(err || !ingredient) {
            return res.status(404).json({message: "Ingredient not found"})
        } else {
            res.locals.ingredient = ingredient
            return next()
        }
    })
}

exports.checkIfRecipesExist = function(req, res, next) {
    const ids = req.params.recipes ? req.params.recipes : req.body.recipes
    Recipe.find({_id: { $in: ids }}).exec(function(err, recipes) {
        if(err || !recipes) {
            res.status(404).json({message: "Recipes not found"})
            return
        }
        res.locals.recipes = recipes
        return next()
    })
}