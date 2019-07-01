import User from "../models/user"
import Recipe from "../models/recipe"
import { addNewItems, removeItems, unflatIngredients, combineQuantities } from '../routes/utils'

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
    const newItems = Object.values(unflatIngredients(items))
    reqUser.shoppingList = addNewItems(reqUser.shoppingList, newItems)
    await reqUser.save()
    return true
}

export const removeItemsFromShoppingList = async function(userID, items) {
    return User.findByIdAndUpdate(userID,
        { $pull: { "shoppingList": { "ingredientID": { $in: items } } } }, {'multi': true, 'new': true}
    ).exec()
        .then((user) => {return Boolean(user)})
        .catch(() => {return false})
}

export const addItemsToFridge = async function(reqUser, items) {
    const newItems = Object.values(unflatIngredients(items))
    reqUser.fridge = addNewItems(reqUser.fridge, newItems)
    await reqUser.save()
    return true
}

export const removeItemsFromFridge = async function(userID, items) {
    return User.findByIdAndUpdate(userID,
        { $pull: { "fridge": {"ingredientID": { $in: items } } } }, {'multi': true, 'new': true}
    ).exec()
        .then((user) => {return Boolean(user)})
        .catch(() => {return false})
}

exports.getItemsFromShoppingList = function(reqUser, items) {
    return reqUser.shoppingList.filter(item => items.includes(item.ingredientID.toString()))
}

exports.getItemsFromFridge = function(reqUser, items) {
    return reqUser.fridge.filter(item => items.includes(item.ingredientID.toString()))
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
        newShoppingList.push(newShoppingListObject[itemKey])
    }

    reqUser.shoppingList = addNewItems(newShoppingList, itemsDiff.toKeep)
    await reqUser.save()
    return bool
}

export const removeCookedIngredients = async function(reqUser, recipeIDs) {
    const cookedIngredients = Object.values(await getIngredientsFromRecipes(recipeIDs))
    reqUser.shoppingList = removeItems(reqUser.shoppingList, cookedIngredients)
    await reqUser.save()
    return true
}

const getIngredientsFromSavedRecipes = async function(reqUser) {
    const recipeIDs = reqUser.savedRecipes.map(item => item.recipeID)
    return await getIngredientsFromRecipes(recipeIDs)
}

const getIngredientsFromRecipes = async function(recipeIDs) {
    const recipes = await Recipe.find({_id: { $in: recipeIDs}})
        .select({'ingredients.ingredientID': 1, 'ingredients.ingredientName': 1,
            'ingredients.quantity': 1, 'ingredients.unit': 1}).exec()
        .then((recipes) => {return recipes})
        .catch(() => {return []})

    let ingredients = []
    for(const recipe of recipes) {
        ingredients.push(...recipe.ingredients)
    }
    return unflatIngredients(ingredients)
}

const buildShoppingListObject = function(reqUser, items) {
    let shoppingList = {...items}
    for(const fridgeItem of reqUser.fridge) {
        const fridgeItemID = fridgeItem.ingredientID.toString()
        if(items.hasOwnProperty(fridgeItemID)) {
            // Subtract item from fridge item and add remaining to diff is any
            const combinedItem = combineQuantities(items[fridgeItemID], fridgeItem, 'GET_REMAINING')
            if(combinedItem.quantities.length > 0) {
                shoppingList[fridgeItemID] = combinedItem
            } else {
                delete shoppingList[fridgeItemID]
            }
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