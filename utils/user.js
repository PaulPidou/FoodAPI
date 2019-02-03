import User from "../models/user"

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

exports.getItemFromShoppingList = function(reqUser, itemID) {
    return reqUser.shoppingList.id(itemID)
}

exports.getItemFromFridge = function(reqUser, itemID) {
    return reqUser.fridge.id(itemID)
}