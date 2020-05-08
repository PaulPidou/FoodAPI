import mongoose from 'mongoose'
import moment from 'moment'
import CryptoJS from 'crypto-js'
import sha256 from 'crypto-js/sha256'
import fetch from 'node-fetch'
import cheerio from 'cheerio'

import Recipe from '../models/recipe'
import Ingredient from "../models/ingredients"
import {parseRecipePage} from "../utils/parser"

// Common
export const handleRecipeUrl = async function(url) {
    const hash = sha256(url).toString(CryptoJS.enc.Hex)
    console.log(hash)
    const recipes = await Recipe.find({ hashId: hash }).select({"_id": 1}).exec()

    if(recipes.length > 0) { return recipes[0]._id }

    fetch(url)
        .then(res => res.text())
        .then(async (html) => {
            const $ = cheerio.load(html)
            const parsedRecipe = parseRecipePage($)
            console.log(parsedRecipe)
            await checkIfRecipeIsInBase(parsedRecipe)
        })
        .catch(err => console.error(err))
}

const checkIfRecipeIsInBase = async function(parsedRecipe) {
    const recipes = await Recipe.find({ title: parsedRecipe.title }).exec()

    let id = null
    if(recipes.length > 0) {
        for(const recipe of recipes) {
            if(isSameRecipes(parsedRecipe, recipe)) {
                id = recipe._id
                break
            }
        }
    }
    return id
}

const isSameRecipes = function(parsedRecipe, inBaseRecipe) {
    return parsedRecipe.totalTime === inBaseRecipe.totalTime &&
        parsedRecipe.recipe.length === inBaseRecipe.recipe.length &&
        parsedRecipe.ingredients.length === inBaseRecipe.ingredients.length &&
        parsedRecipe.recipe.every(step => inBaseRecipe.recipe.includes(step)) &&
        parsedRecipe.ingredients.every(fIng => inBaseRecipe.ingredients
            .map(sIng => sIng.ingredientName).includes(fIng.ingredientName))
}

const sortObject = function(obj) {
    let sortable = []
    for (const key in obj) {
        sortable.push([key, obj[key]])
    }
    return sortable.sort(function(a, b) { return b[1] - a[1] })
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
    if(item.hasOwnProperty('quantities')) {
        return item
    }
    const combinedItem = {
        ingredientID: item.ingredientID,
        ingredientName: item.ingredientName,
        quantities: [{unit: item.unit, quantity: item.quantity}]
    }
    if(item.hasOwnProperty('expirationDate')) {
        return {
            ...combinedItem,
            expirationDate: item.expirationDate
        }
    } else if(item.hasOwnProperty('associatedProduct')) {
        return {
            ...combinedItem,
            associatedProduct: item.associatedProduct
        }
    } else {
        return combinedItem
    }
}

const getObject = function(obj) {
    if(typeof obj.toObject === 'function') {
        return obj.toObject()
    } else {
        return obj
    }
}

// Public
export const getRecipesSummary = async function(recipeIDs) {
    return await Recipe.find({_id: { $in: recipeIDs }}).select(
        {"title": 1, "budget": 1, "picture": 1, "difficulty": 1, "totalTime": 1, 'ingredients.ingredientID': 1,
            'ingredients.quantity': 1, 'ingredients.unit': 1}).exec()
}

export const getRecipesWithSubstitutes = async function(recipeIDs) {
    return await Recipe.aggregate([
        { $match : { _id: { $in: recipeIDs.map(id => mongoose.mongo.ObjectId(id)) }}},
        { $unwind: { path: "$ingredients" }},
        { $lookup: {
                from: 'ingredients',
                localField: 'ingredients.ingredientID',
                foreignField: '_id',
                as: 'temp'
            }},
        { $unwind: { path: "$temp" }},
        { $addFields: { "ingredients.substitutes": "$temp.substitutes" }},
        { $group: {
                _id: "$_id",
                recipe: { "$first": "$$ROOT" },
                ingredients: { $push: "$ingredients" }
            }},
        { $project: { "recipe.ingredients": 0, "recipe.temp": 0 }},
        { $addFields: { "recipe.ingredients": "$ingredients" }},
        { $replaceRoot: { newRoot: "$recipe" }}
    ]).exec()
}

export const getRecipesByIngredients = async function(ingredientIDs, seasonal, maxRecipes=50) {
    const recipesID = await Ingredient.aggregate([
        { $match : { _id: { $in: ingredientIDs.map(id => mongoose.mongo.ObjectId(id)) }}},
        { $project : { recipes: 1 }},
        { $unwind: { path: "$recipes", preserveNullAndEmptyArrays: true }},
        { $group: { _id: "$recipes", count: { $sum: 1 }}},
        { $sort: { count: -1 }}
    ]).limit(maxRecipes).exec()

    let scores = {}
    for (const recipe of recipesID) {
        scores[recipe._id] = {
            count: recipe.count,
            recipeCoverage: 0,
            listCoverage: 0
        }
    }

    if(!scores) { return [] }

    const recipesDetails = await getRecipesSummary(Object.keys(scores))

    let forbiddenIngredients = []
    if(seasonal) {
        const nonSeasonalIngredients = await getNonSeasonalIngredients()
        forbiddenIngredients = nonSeasonalIngredients.map(item => item._id).filter(value => !ingredientIDs.includes(value))
    }

    let recipes = {}
    let recipesCache = {}
    for (const recipeDetails of recipesDetails) {
        if(!scores.hasOwnProperty(recipeDetails._id)) { continue }

        if(seasonal) {
            const overlap = recipeDetails.ingredients.map(item => item.ingredientID).filter(value => forbiddenIngredients.includes(value))
            if(overlap.length > 0) { continue }
        }

        scores[recipeDetails._id].listCoverage = scores[recipeDetails._id].count / ingredientIDs.length
        scores[recipeDetails._id].recipeCoverage = scores[recipeDetails._id].count / recipeDetails.ingredients.length
        recipesCache[recipeDetails._id] = recipeDetails

        // Better to have a recipe we can do right away than a recipe with missing ingredients
        recipes[recipeDetails._id] = 0.2 * scores[recipeDetails._id].listCoverage + 0.8 * scores[recipeDetails._id].recipeCoverage
    }

    let results = []
    for(const recipe of sortObject(recipes)) {
        results.push({
            _id: recipesCache[recipe[0]]._id,
            title: recipesCache[recipe[0]].title,
            budget: recipesCache[recipe[0]].budget,
            picture: recipesCache[recipe[0]].picture,
            difficulty: recipesCache[recipe[0]].difficulty,
            totalTime: recipesCache[recipe[0]].totalTime,
            ingredients: recipesCache[recipe[0]].ingredients,
            score: recipe[1]
        })
    }
    return results
}

export const getNonSeasonalIngredients = async function() {
    const currentMonth = moment().format('MMMM')
    return await Ingredient.find({ "season.unavailable": currentMonth }).select({'_id': 1}).exec()
}

export const getNonSeasonalRecipes = async function() {
    const currentMonth = moment().format('MMMM')
    const recipesID = await Ingredient.aggregate([
        { $match : { "season.unavailable": currentMonth }},
        { $unwind: { path: "$recipes" }},
        { $group: {
                _id: null,
                recipesID: { $addToSet: "$recipes"}
            }
        }]).exec()
    return recipesID[0].recipesID
}

export const formatRecipesWithScore = function(err, recipes, scoreCache) {
    if(err || !recipes) {
        return []
    }

    return recipes.map((recipe) => {
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
    })
}

// User
export const getCorrespondingItem = function(itemList, itemID) {
    for(const item of itemList) {
        if(item.ingredientID.toString() === itemID) {
            return item
        }
    }
    return {}
}

export const combineQuantities = function(currentItem1, currentItem2, operation) {
    let item1 = {
        ...currentItem1,
        quantities: convertListToObject(currentItem1.quantities)
    }
    let item2 = {
        ...currentItem2,
        quantities: convertListToObject(currentItem2.quantities)
    }
    let combinedItem = {...item1}
    combinedItem.quantities = {}

    for(const unit in item1.quantities) {
        if(item2.quantities.hasOwnProperty(unit)) {
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

    if(operation === 'ADD') {
        for(const unit in item2.quantities) {
            if(!item1.quantities.hasOwnProperty(unit)) {
                combinedItem.quantities[unit] = item2.quantities[unit]
            }
        }
    } else { // SUBTRACT or GET_REMAINING
        if(item2.quantities.hasOwnProperty('INFINITY')) {
            combinedItem.quantities = {}
        }
    }

    combinedItem.quantities = convertObjectToList(combinedItem.quantities)
    return combinedItem
}

export const getDiffQuantities = function(currentShoppingListItem, currentNeededItem) {
    let shoppingListItem = {
        ...getObject(currentShoppingListItem),
        quantities: convertListToObject(currentShoppingListItem.quantities)
    }
    let neededItem = {
        ...getObject(currentNeededItem),
        quantities: convertListToObject(currentNeededItem.quantities)
    }

    let toKeepQuantities = {}
    let toRemoveQuantities = {}
    for(const unit in shoppingListItem.quantities) {
        if(neededItem.quantities.hasOwnProperty(unit)) {
            const diff = shoppingListItem.quantities[unit] - neededItem.quantities[unit]
            if(diff > 0) {
                toKeepQuantities[unit] = diff
            } else if(diff < 0) {
                toRemoveQuantities[unit] = Math.abs(diff)
            }
        } else {
            toKeepQuantities[unit] = shoppingListItem.quantities[unit]
        }
    }

    for(const unit in neededItem.quantities) {
        if(!shoppingListItem.quantities.hasOwnProperty(unit)) {
            toRemoveQuantities[unit] = neededItem.quantities[unit]
        }
    }

    toKeepQuantities = convertObjectToList(toKeepQuantities)
    toRemoveQuantities = convertObjectToList(toRemoveQuantities)

    if(toKeepQuantities.length > 0) {
        if(toRemoveQuantities.length > 0) {
            return {
                toKeep: {
                    ...shoppingListItem,
                    quantities: toKeepQuantities
                },
                toRemove: {
                    ...shoppingListItem,
                    quantities: toRemoveQuantities
                }
            }
        } else {
            return {
                toKeep: {
                    ...shoppingListItem,
                    quantities: toKeepQuantities
                },
                toRemove: {}
            }
        }
    } else {
        if(toRemoveQuantities.length > 0) {
            return {
                toKeep: {},
                toRemove: {
                    ...shoppingListItem,
                    quantities: toRemoveQuantities
                }
            }
        } else {
            return {
                toKeep: {},
                toRemove: {}
            }
        }
    }
}

export const unflatIngredients = function(ingredients) {
    let ingredientsObject = {}
    for(const ingredient of ingredients) {
        const ingredientID = ingredient.ingredientID.toString()
        const combinedIngredient = convertFlatItemToCombinedOne(ingredient)

        if(ingredientsObject.hasOwnProperty(ingredientID)) {
            ingredientsObject[ingredientID] =
                combineQuantities(ingredientsObject[ingredientID], combinedIngredient, 'ADD')
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

export const addAssociatedProducts = function(newShoppingList, userShoppingList) {
    let itemsWithProducts = []

    const newItemsID = newShoppingList.map(item => item.ingredientID.toString())
    const userItemsID = userShoppingList.map(item => item.ingredientID.toString())
    const overlapIDs = newItemsID.filter(value => userItemsID.includes(value))

    for(const newItem of newShoppingList) {
        if(overlapIDs.includes(newItem.ingredientID.toString())) {
            const userItem = getCorrespondingItem(userShoppingList, newItem.ingredientID.toString())
            if(userItem.hasOwnProperty('associatedProduct')) {
                itemsWithProducts.push({
                    ...newItem,
                    associatedProduct: userItem.associatedProduct
                })
            } else {
                itemsWithProducts.push(newItem)
            }
        } else {
            itemsWithProducts.push(newItem)
        }
    }
    return itemsWithProducts
}