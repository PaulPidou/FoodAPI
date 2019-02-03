import User from "../models/user"

exports.addItemsToShoppingList = async function(reqUser, items) {
    reqUser.shoppingList.push(...items)
    await reqUser.save()
    return true
}

exports.removeItemFromShoppingList = async function(userID, itemID) {
    return User.findByIdAndUpdate(userID,
        { $pull: { "shoppingList": {"_id": itemID}}}, {'new': true}
    ).exec()
        .then((user) => {return Boolean(user)})
        .catch(() => {return false})
}

exports.addItemToFridge = async function(reqUser, item) {
    reqUser.fridge.push(item)
    const user = await reqUser.save()
    return user.fridge[user.fridge.length-1]._id
}

exports.removeItemFromFridge = async function(userID, itemID) {
    return User.findByIdAndUpdate(userID,
        { $pull: { "fridge": {"_id": itemID}}}, {'new': true}
    ).exec()
        .then((user) => {return Boolean(user)})
        .catch(() => {return false})
}

exports.getItemFromShoppingList = function(reqUser, itemID) {
    return reqUser.shoppingList.id(itemID)
}

exports.getItemFromFridge = function(reqUser, itemID) {
    return reqUser.fridge.id(itemID)
}