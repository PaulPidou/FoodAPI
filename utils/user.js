import User from "../models/user"
import Recipe from "../models/recipe"
import { addNewItems, removeItems, unflatIngredients, combineQuantities, getDiffQuantities } from '../routes/utils'

/**
 * Get ingredients from saved recipes of a given user
 * @param reqUser - A given user
 * @returns {Promise<Object>} - Ingredients
 */
const getIngredientsFromSavedRecipes = async function(reqUser) {
    const recipeIDs = reqUser.savedRecipes.map(item => item.recipeID)
    return await getIngredientsFromRecipes(recipeIDs)
}

/**
 * Get ingredients from an array of recipes
 * @param {Array<string>} recipeIDs - IDs of the recipes
 * @returns {Promise<Object>} - A set of ingredients
 */
const getIngredientsFromRecipes = async function(recipeIDs) {
    const recipes = await Recipe.find({_id: { $in: recipeIDs}})
        .select({'ingredients.ingredientID': 1, 'ingredients.ingredientName': 1,
            'ingredients.quantity': 1, 'ingredients.unit': 1}).exec()
        .then((recipes) => { return recipes })
        .catch(() => { return [] })

    let ingredients = []
    for(const recipe of recipes) {
        ingredients.push(...recipe.ingredients)
    }
    return unflatIngredients(ingredients)
}

/**
 * Build a shopping list as an object according to a given user (fridge) and a set of ingredients
 * @param reqUser - A given user for whom the fridge is analyzed
 * @param {Object} items - A set of ingredients
 * @returns {Object} - Shopping list built
 */
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

/**
 * Get differences between user's shopping list and a given shopping list (as an object)
 * @param reqUser - A given user
 * @param {Object} shoppingListObject - A given shopping list
 * @returns {{toKeep: Array, toRemove: Object}} - Differences between the two shopping lists
 */
const getDiffBetweenShoppingLists = function(reqUser, shoppingListObject) {
    let toKeep = []
    let toRemove = {}
    for(const slItem of reqUser.shoppingList) {
        const ingredientID = slItem.ingredientID.toString()
        if(shoppingListObject.hasOwnProperty(ingredientID)) {
            const diffQuantities = getDiffQuantities(slItem, shoppingListObject[ingredientID])
            if(Object.keys(diffQuantities.toKeep).length > 0) {
                toKeep.push(diffQuantities.toKeep)
            }
            if(Object.keys(diffQuantities.toRemove).length > 0) {
                toRemove[ingredientID] = diffQuantities.toRemove
            }
        } else {
            toKeep.push(slItem)
        }
    }

    const itemIDs = reqUser.shoppingList.map(item => item.ingredientID.toString())
    for(const itemKey in shoppingListObject) {
        if(!itemIDs.includes(itemKey)) {
            toRemove[itemKey] = shoppingListObject[itemKey]
        }
    }
    return { toKeep, toRemove }
}

/**
 * Save recipes within the saved recipes list of a given user
 * @param reqUser - User for whom recipes are saved
 * @param {Array<string>} recipes - IDs of the recipes to save
 * @returns {Promise<boolean>} - Return true
 */
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

/**
 * Remove recipes from the saved recipes list of a given user
 * @param userID - ID of the user for whom recipes are removed
 * @param {Array<string>} recipes - IDs of the recipes to remove
 * @returns {Promise<boolean | never>} - Indication if the operation succeeded or not
 */
export const removeRecipes = async function(userID, recipes) {
    return User.findByIdAndUpdate(userID,
        { $pull: { "savedRecipes": {"recipeID": {$in: recipes}}}}, {'multi': true, 'new': true}
    ).exec()
        .then(() => { return true })
        .catch(() => { return false })
}

/**
 * Add items to the shopping list of a given user
 * @param reqUser - User for whom items are added
 * @param {Array<Object>} items - List of items to add
 * @returns {Promise<boolean>} - Return true
 */
export const addItemsToShoppingList = async function(reqUser, items) {
    const newItems = Object.values(unflatIngredients(items))
    reqUser.shoppingList = addNewItems(reqUser.shoppingList, newItems)
    await reqUser.save()
    return true
}

/**
 * Remove items from the shopping list of a given user
 * @param userID - ID of the user for whom items are removed
 * @param {Array<string>} items - List of ingredient IDs (items to remove)
 * @returns {Promise<boolean | never>} - Indication if the operation succeeded or not
 */
export const removeItemsFromShoppingList = async function(userID, items) {
    return User.findByIdAndUpdate(userID,
        { $pull: { "shoppingList": { "ingredientID": { $in: items } } } }, {'multi': true, 'new': true}
    ).exec()
        .then((user) => {return Boolean(user)})
        .catch(() => {return false})
}

/**
 * Add items to the fridge of a given user
 * @param reqUser - User for whom items are added
 * @param {Array<Object>} items - List of items to add
 * @returns {Promise<boolean>} - Return true
 */
export const addItemsToFridge = async function(reqUser, items) {
    const newItems = Object.values(unflatIngredients(items))
    reqUser.fridge = addNewItems(reqUser.fridge, newItems)
    await reqUser.save()
    return true
}

/**
 * Remove items from the fridge of a given user
 * @param userID - ID of the user for whom items are removed
 * @param {Array<string>} items - List of ingredient IDs (items to remove)
 * @returns {Promise<boolean | never>} - Indication if the operation succeeded or not
 */
export const removeItemsFromFridge = async function(userID, items) {
    return User.findByIdAndUpdate(userID,
        { $pull: { "fridge": {"ingredientID": { $in: items } } } }, {'multi': true, 'new': true}
    ).exec()
        .then((user) => {return Boolean(user)})
        .catch(() => {return false})
}

/**
 * Remove cooked ingredients from fridge for a given user
 * @param reqUser - A given user
 * @param {Array<string>} recipeIDs - List of recipes IDs
 * @returns {Promise<boolean>} - Return true
 */
export const removeCookedIngredients = async function(reqUser, recipeIDs) {
    const cookedIngredients = Object.values(await getIngredientsFromRecipes(recipeIDs))
    reqUser.frdige = removeItems(reqUser.fridge, cookedIngredients)
    await reqUser.save()
    return true
}

/**
 * Get items from the shopping list of a given user
 * @param reqUser - A given user
 * @param {Array<string>} items - List of ingredient IDs
 * @returns {Array<Object>} - Items within the shopping list matching the given *items*
 */
export const getItemsFromShoppingList = function(reqUser, items) {
    return reqUser.shoppingList.filter(item => items.includes(item.ingredientID.toString()))
}

/**
 * Get items from the fridge of a given user
 * @param reqUser - A given user
 * @param {Array<string>} items - List of ingredient IDs
 * @returns {Array<Object>} - Items within the fridge matching the given *items*
 */
export const getItemsFromFridge = function(reqUser, items) {
    return reqUser.fridge.filter(item => items.includes(item.ingredientID.toString()))
}

/**
 * Handle dependencies between user's lists (SavedRecipes, Fridge, ShoppingList)
 * @param reqUser - A given user
 * @param {string} action - An action to perform
 * @param {Array<Object>} object - Object of the action
 * @returns {Promise<boolean>} - Indication if the operation succeeded or not
 */
export const handleListDependencies = async function(reqUser, action, object) {
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

    const user = await User.findById(reqUser._id)

    const newNeededIngredients = await getIngredientsFromSavedRecipes(user)
    const newShoppingListObject = buildShoppingListObject(user, newNeededIngredients)

    const newShoppingList = []
    for(const itemKey in newShoppingListObject) {
        if(itemsDiff.toRemove.hasOwnProperty(itemKey)) {
            const combinedItem = combineQuantities(newShoppingListObject[itemKey], itemsDiff.toRemove[itemKey], 'SUBTRACT')
            if(combinedItem.quantities.length > 0) {
                newShoppingList.push(combinedItem)
            }
        } else {
            newShoppingList.push(newShoppingListObject[itemKey])
        }
    }

    reqUser.shoppingList = addNewItems(newShoppingList, itemsDiff.toKeep)
    await reqUser.save()
    return bool
}