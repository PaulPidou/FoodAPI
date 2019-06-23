import User from "../models/user"
import Recipe from "../models/recipe"
import { addNewItems } from '../routes/utils'

exports.addItemsToShoppingList = async function(reqUser, items) {
    reqUser.shoppingList.push(...items)
    await reqUser.save()
    return true
}

exports.removeItemsFromShoppingList = async function(userID, items) {
    return User.findByIdAndUpdate(userID,
        { $pull: { "shoppingList": { "_id": { $in: items } } } }, {'multi': true, 'new': true}
    ).exec()
        .then((user) => {return Boolean(user)})
        .catch(() => {return false})
}

exports.addItemsToFridge = async function(reqUser, items) {
    reqUser.fridge.push(...items)
    await reqUser.save()
    return true
}

exports.removeItemsFromFridge = async function(userID, items) {
    return User.findByIdAndUpdate(userID,
        { $pull: { "fridge": {"_id": { $in: items } } } }, {'multi': true, 'new': true}
    ).exec()
        .then((user) => {return Boolean(user)})
        .catch(() => {return false})
}

exports.getItemsFromShoppingList = function(reqUser, items) {
    return reqUser.shoppingList.filter(item => items.includes(item._id.toString()))
}

exports.getItemsFromFridge = function(reqUser, items) {
    return reqUser.fridge.filter(item => items.includes(item._id.toString()))
}

exports.saveRecipesWithIngredients = async function(reqUser, recipesToSave) {
    const currentNeededIngredients = await getIngredientsFromSavedRecipes(reqUser)
    const currentShoppingListObject = buildShoppingListObject(reqUser, currentNeededIngredients)
    const itemsDiff = getDiffBetweenShoppingLists(reqUser, currentShoppingListObject)

    for(const recipeID of recipesToSave) {
        reqUser.savedRecipes.push({
            recipeID: recipeID,
            savingDate: Date.now()
        })
    }
    await reqUser.save()

    const newNeededIngredients = await getIngredientsFromSavedRecipes(reqUser)
    const newShoppingListObject = buildShoppingListObject(reqUser, newNeededIngredients)

    const newShoppingList = []
    for(const itemKey in newShoppingListObject) {
        if(itemsDiff.toRemove.includes(itemKey)) { continue }
        newShoppingList.push({
            ingredientID: itemKey,
            ...newShoppingListObject[itemKey]
        })
    }

    reqUser.shoppingList = addNewItems(newShoppingList, itemsDiff.toKeep)
    await reqUser.save()
    return true
}

const getIngredientsFromSavedRecipes = async function(reqUser) {
    const recipeIDs = reqUser.savedRecipes.map(item => item.recipeID)
    const recipes = await Recipe.find({_id: { $in: recipeIDs}})
        .select({'ingredients.ingredientID': 1, 'ingredients.ingredient': 1,
            'ingredients.quantity': 1, 'ingredients.unit': 1}).exec()
        .then((recipes) => {return recipes})
        .catch(() => {return []})

    let ingredients = {}
    for(const recipe of recipes) {
        for(const ingredient of recipe.ingredients) {
            if(ingredients.hasOwnProperty(ingredient)) {
                // TO DO: add quantity according to unit
            } else {
                ingredients[ingredient.ingredientID] = {
                    ingredientName: ingredient.ingredient,
                    quantity: ingredient.quantity,
                    unit: ingredient.unit
                }
            }
        }
    }
    return ingredients
}

const buildShoppingListObject = function(reqUser, items) {
    let shoppingList = {...items}
    const ingredientIDs = Object.keys(items)
    for(const fridgeItem of reqUser.fridge) {
        const fridgeItemID = fridgeItem.ingredientID.toString()
        if(ingredientIDs.includes(fridgeItemID)) {
            // TO DO: Subtract item from fridge item and add remaining to diff is any
            delete shoppingList[fridgeItemID]
        }
    }
    return shoppingList
}

const getDiffBetweenShoppingLists = function(reqUser, shoppingListObject) {
    let toKeep = []
    for(const slItem of reqUser.shoppingList) {
        if(shoppingListObject.hasOwnProperty(slItem.ingredientID.toString())) {
            // Check diff at quantity and unit level
        } else {
            toKeep.push(slItem)
        }
    }

    let toRemove = []
    const itemIDs = reqUser.shoppingList.map(item => item.ingredientID.toString())
    for(const itemKey in shoppingListObject) {
        if(itemIDs.includes(itemKey)) {
            // Check diff at quantity and unit level
        } else {
            toRemove.push(itemKey)
        }
    }
    return { toKeep, toRemove }
}