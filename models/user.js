import mongoose from 'mongoose'
import passportLocalMongoose from 'passport-local-mongoose'
import bcrypt from 'bcryptjs'

const ItemQuantity = new mongoose.Schema({
    _id: false,
    quantity: { type: Number },
    unit: {type: String }
})

const ShoppingItem = new mongoose.Schema({
    _id: false,
    ingredientID: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    ingredientName: {
        type: String,
        required: true
    },
    quantities: [ItemQuantity]
})

const FridgeItem = new mongoose.Schema({
    _id: false,
    ingredientID: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    ingredientName: {
        type: String,
        required: true
    },
    quantities: [ItemQuantity],
    expirationDate: {
        type: Date
    }
})

const Parameters = new mongoose.Schema({
    _id: false,
    keepFoodListsIndependent: {
        type: Boolean,
        default: false
    }
})

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        index: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill in with a valid email address']
    },
    password: {
        type: String,
        required: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    savedRecipes: {
        type: [{
            _id: false,
            recipeID: mongoose.Schema.Types.ObjectId,
            savingDate: Date
        }]
    },
    shoppingList: [ShoppingItem],
    fridge: [FridgeItem],
    parameters: {
        type: Parameters,
        default: {keepFoodListsIndependent: false, transferCheckedShoppingListItemsToFridge: true}
    }
})

UserSchema.pre('save', function(next) {
    const user = this

    if (!user.isModified('password')) return next()

    bcrypt.genSalt(12, function(err, salt) {
        if (err) return next(err)
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err)
            user.password = hash
            next()
        })
    })
})

UserSchema.methods.toJSON = function() {
    const obj = this.toObject()
    delete obj.password
    if (obj.hasOwnProperty('__v')) { delete obj.__v }
    return obj
}

UserSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err)
        cb(null, isMatch)
    })
}

UserSchema.plugin(passportLocalMongoose, {"usernameField": "email"})

const User = mongoose.model('User', UserSchema)

export default User
