import User from "../models/user"
import Recipe from "../models/recipe"
import { addNewItems } from '../routes/utils'

export const saveRecipes = async function(reqUser, recipes) {
    for (const recipeID of recipes) {
        reqUser.savedRecipes.push({
            recipeID: recipeID,
            savingDate: Date.now()
        })
    }
    await reqUser.save()
    return true
}

export const removeRecipes = async function(userID, recipes) {
    return User.findByIdAndUpdate(userID,
        { $pull: { "savedRecipes": {"recipeID": {$in: recipes}}}}, {'multi': true, 'new': true}
    ).exec()
        .then(() => { return true })
        .catch(() => { return false })
}

export const addItemsToShoppingList = async function(reqUser, items) {
    reqUser.shoppingList.push(...items)
    await reqUser.save()
    return true
}

export const removeItemsFromShoppingList = async function(userID, items) {
    return User.findByIdAndUpdate(userID,
        { $pull: { "shoppingList": { "_id": { $in: items } } } }, {'multi': true, 'new': true}
    ).exec()
        .then((user) => {return Boolean(user)})
        .catch(() => {return false})
}

export const addItemsToFridge = async function(reqUser, items) {
    reqUser.fridge.push(...items)
    await reqUser.save()
    return true
}

export const removeItemsFromFridge = async function(userID, items) {
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

exports.handleListDependencies = async function(reqUser, action, object) {
    const currentNeededIngredients = await getIngredientsFromSavedRecipes(reqUser)
    const currentShoppingListObject = buildShoppingListObject(reqUser, currentNeededIngredients)
    const itemsDiff = getDiffBetweenShoppingLists(reqUser, currentShoppingListObject)

    let bool = false
    switch(action) {
        case 'SAVE_RECIPES':
            bool = await saveRecipes(reqUser, object)
            break
        case 'REMOVE_RECIPES':
            bool = await removeRecipes(reqUser._id, object)
            break
        case 'ADD_ITEMS_TO_FRIDGE':
            bool = await addItemsToFridge(reqUser, object)
            break
        case 'REMOVE_ITEMS_FROM_FRIDGE':
            bool = await removeItemsFromFridge(reqUser._id, object)
            break
        default:
            break
    }

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
    return bool
}

const getIngredientsFromSavedRecipes = async function(reqUser) {
    const recipeIDs = reqUser.savedRecipes.map(item => item.recipeID)
    const recipes = await Recipe.find({_id: { $in: recipeIDs}})
        .select({'ingredients.ingredientID': 1, 'ingredients.ingredientName': 1,
            'ingredients.quantity': 1, 'ingredients.unit': 1}).exec()
        .then((recipes) => {return recipes})
        .catch(() => {return []})

    let ingredients = {}
    for(const recipe of recipes) {
        for(const ingredient of recipe.ingredients) {
            if(ingredients.hasOwnProperty(ingredient.ingredientID.toString())) {
                // TO DO: add quantity according to unit
            } else {
                ingredients[ingredient.ingredientID.toString()] = {
                    ingredientName: ingredient.ingredientName,
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