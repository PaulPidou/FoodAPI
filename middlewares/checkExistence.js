import Ingredient from "../models/ingredients"
import Recipe from "../models/recipe"

exports.checkIfIngredientsExist = function(req, res, next) {
    let ids = req.params.ingredients ? req.params.ingredients.split(',') : req.body.ingredients

    if(!ids || !ids.length) {
        res.status(422).json({message: "Invalid input"})
        return
    }

    if (typeof ids[0] === 'object') { ids = ids.map(item => item.ingredientID) }

    Ingredient.find({_id: { $in: ids }}).exec(function(err, ingredients) {
        if(err || !ingredients) {
            res.status(404).json({ message: "Ingredients not found" })
            return
        }
        res.locals.ingredients = ingredients
        return next()
    })
}

exports.checkIfIngredientsAndSubstitutesExist = function(req, res, next) {
    let ingredients = req.body.ingredients

    if(!ingredients || !ingredients.length) {
        res.status(422).json({message: "Invalid input"})
        return
    }

    let ids = []
    for (const ingredient of ingredients) {
        if(typeof ingredient !== 'object') {
            res.status(422).json({message: "Invalid input"})
            return
        }
        ids.push(ingredient.ingredientID)
        ids.push(...ingredient.substitutes.map(item => item.ingredientID))
    }

    Ingredient.find({_id: { $in: [...new Set(ids)] }}).select({'name': 1}).exec(function(err, ingredients) {
        if(err || !ingredients) {
            res.status(404).json({ message: "Ingredients not found" })
            return
        }

        let ingredientsObj = {}
        for(const ingredient of ingredients) {
            ingredientsObj[ingredient._id] = ingredient.name
        }

        let ingredientsWithSubstitutes = []
        for (const ingredient of req.body.ingredients) {
            ingredientsWithSubstitutes.push({
                ingredientID: ingredient.ingredientID,
                substitutes: ingredient.substitutes.map((item) => {
                    return {
                        ingredientID: item.ingredientID,
                        ingredientName: ingredientsObj[item.ingredientID],
                        similarityScore: item.similarityScore
                    }
                })
            })
        }

        res.locals.ingredients = ingredientsWithSubstitutes
        return next()
    })
}

exports.checkIfRecipesExist = function(req, res, next) {
    const ids = req.params.recipes ? req.params.recipes.split(',') : req.body.recipes

    if(!ids || !ids.length) {
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