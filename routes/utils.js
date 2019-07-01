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

const convertListToObject = function(quantities) {
    let quantitiesObject = {}
    for(const quantity of quantities) {
        quantitiesObject[quantity.unit] = quantity.quantity
    }
    return quantitiesObject
}

const convertObjectToList = function(quantities) {
    let quantitiesList = []
    for(const unit in quantities) {
        quantitiesList.push({unit: unit, quantity: quantities[unit]})
    }
    return quantitiesList
}

const convertFlatItemToCombinedOne = function(item) {
    const newItem = {...item}
    newItem.quantities = [{unit: item.unit, quantity: item.quantity}]
    delete newItem.unit
    delete newItem.quantity
    return newItem
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
    let recipesCache = {}
    for (const recipeID in scores) {
        if(!scores.hasOwnProperty(recipeID)) { continue }

        scores[recipeID].listCoverage = scores[recipeID].count / ingredientIDs.length
        const recipe = await Recipe.findById(recipeID).select(
            {"title": 1, "budget": 1, "difficulty": 1, "totalTime": 1, "ingredients": 1}).exec()
        if (recipe) {
            scores[recipeID].recipeCoverage = scores[recipeID].count / recipe.ingredients.length
            recipesCache[recipeID] = recipe
        }
        // Better to have a recipe we can do right away than a recipe with missing ingredients
        recipes[recipeID] = 0.2 * scores[recipeID].listCoverage + 0.8 * scores[recipeID].recipeCoverage
    }

    let results = []
    for(const recipe of sortObject(recipes)) {
        results.push({
            _id: recipesCache[recipe[0]]._id,
            title: recipesCache[recipe[0]].title,
            budget: recipesCache[recipe[0]].budget,
            difficulty: recipesCache[recipe[0]].difficulty,
            totalTime: recipesCache[recipe[0]].totalTime,
            ingredients: recipesCache[recipe[0]].ingredients,
            score: recipe[1]
        })
    }
    return results
}

export const getCorrespondingItem = function(itemList, itemID) {
    for(const item of itemList) {
        if(item.ingredientID.toString() === itemID) {
            return item
        }
    }
    return {}
}

export const combineQuantities = function(item1, item2, operation) {
    item1.quantities = convertListToObject(item1.quantities)
    item2.quantities = convertListToObject(item2.quantities)
    let combinedItem = {...item1}
    combinedItem.quantities = {}

    for(const unit in item1.quantities) {
        if(item2.hasOwnProperty(unit)) {
            if(operation === 'ADD') {
                combinedItem.quantities[unit] = item1.quantities[unit] + item2.quantities[unit]
            } else { // SUBTRACT or GET_REMAINING
                const diff = item1.quantities[unit] - item2.quantities[unit]
                if(diff > 0) {
                    combinedItem.quantities[unit] = diff
                }
            }
        } else {
            combinedItem.quantities[unit] = item1.quantities[unit]
        }
    }

    if(operation !== 'GET_REMAINING') {
        for(const unit in item2.quantities) {
            if(!item1.hasOwnProperty(unit)) {
                combinedItem.quantities[unit] = item2.quantities[unit]
            }
        }
    }

    combinedItem.quantities = convertObjectToList(combinedItem.quantities)
    return combinedItem
}

export const unflatIngredients = function(ingredients) {
    let ingredientsObject = {}
    for(const ingredient of ingredients) {
        const ingredientID = ingredient.ingredientID.toString()
        const combinedIngredient = convertFlatItemToCombinedOne(ingredient)

        if(ingredientsObject.hasOwnProperty(ingredientID)) {
            ingredientsObject[ingredientID] =
                combineQuantities(ingredients[ingredientID], combinedIngredient, 'ADD')
        } else {
            ingredientsObject[ingredientID] = combinedIngredient
        }
    }
    return ingredientsObject
}

export const addNewItems = function(userItems, newItems) {
    let combinedItems = []

    const userItemsID = userItems.map(item => item.ingredientID.toString())
    const newItemsID = newItems.map(item => item.ingredientID.toString())
    const overlapIDs = userItemsID.filter(value => newItemsID.includes(value))

    for(const userItem of userItems) {
        if(overlapIDs.includes(userItem.ingredientID.toString())) {
            const newItem = getCorrespondingItem(newItems, userItem.ingredientID.toString())
            combinedItems.push(combineQuantities(userItem, newItem, 'ADD'))
        } else {
            combinedItems.push(userItem)
        }
    }

    for(const newItem of newItems) {
        if(!overlapIDs.includes(newItem.ingredientID.toString())) {
            combinedItems.push(newItem)
        }
    }
    return combinedItems
}

export const removeItems = function(userItems, itemsToRemove) {
    let combinedItems = []

    const userItemsID = userItems.map(item => item.ingredientID.toString())
    const itemsToRemoveID = itemsToRemove.map(item => item.ingredientID.toString())
    const overlapIDs = userItemsID.filter(value => itemsToRemoveID.includes(value))

    for(const userItem of userItems) {
        if(overlapIDs.includes(userItem.ingredientID.toString())) {
            const newItem = getCorrespondingItem(itemsToRemove, userItem.ingredientID.toString())
            const combinedItem = combineQuantities(userItem, newItem, 'SUBTRACT')
            if(combinedItem.quantities.length > 0) {
                combinedItems.push(combinedItem)
            }
        } else {
            combinedItems.push(userItem)
        }
    }
    // No need to loop over itemsToRemove as we can only remove items which are within the userItems
    return combinedItems
}