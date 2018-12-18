import Ingredient from "../models/ingredients"
import Recipe from "../models/recipe"

const sortObject = function(obj) {
    let sortable = []
    for (const key in obj) {
        sortable.push([key, obj[key]])
    }
    return sortable.sort(function(a, b) { return b[1] - a[1] })
}

const sortAndLimit = function(obj, filterKey, limit) {
    const objToSort = {}
    for (const key in obj) {
        objToSort[key] = obj[key][filterKey]
    }
    const sortArray = sortObject(objToSort).slice(limit - 1)

    let objToReturn = {}
    for (const item of sortArray) {
        objToReturn[item[0]] = obj[item[0]]
    }
    return objToReturn
}

// Public
export const getRecipesByIngredients = async function(ingredientIDs, maxRecipes=100) {
    let scores = {}
    for (const id of ingredientIDs) {
        const ingredient = await Ingredient.findById(id).exec()
        if(ingredient) {
            for (const recipe of ingredient.recipes) {
                if (!scores.hasOwnProperty(recipe)) {
                    scores[recipe] = {
                        count: 0,
                        recipeCoverage: 0,
                        listCoverage: 0
                    }
                }
                scores[recipe].count++
            }
        }
    }

    if (Object.keys(scores).length > maxRecipes) {
        scores = sortAndLimit(scores, 'count', maxRecipes)
    }

    let recipes = {}
    for (const recipeID in scores) {
        scores[recipeID].listCoverage = scores[recipeID].count / ingredientIDs.length
        const recipe = await Recipe.findById(recipeID).exec()
        if (recipe) {
            scores[recipeID].recipeCoverage = scores[recipeID].count / recipe.ingredients.length
        }
        // Better to have a recipe we can do right away than a recipe with missing ingredients
        recipes[recipeID] = 0.2 * scores[recipeID].listCoverage + 0.8 * scores[recipeID].recipeCoverage
    }

    return sortObject(recipes)
}