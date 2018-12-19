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

exports.checkIfRecipeExist = function(req, res, next) {
    const id = req.params.recipeID ? req.params.recipeID : req.body.recipeID
    Recipe.findById(id).exec(async function(err, recipe) {
        if(err || !recipe) {
            return res.status(404).json({message: "Recipe not found"})
        } else {
            res.locals.recipe = recipe
            return next()
        }
    })
}