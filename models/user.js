import mongoose from 'mongoose'
import passportLocalMongoose from 'passport-local-mongoose'
import bcrypt from 'bcryptjs'

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
            recipeID: mongoose.Schema.Types.ObjectId,
            savingDate: Date
        }]
    },
    shoppingList: {
        type: [{
            ingredientID: mongoose.Schema.Types.ObjectId,
            quantity: Number,
            unit: String
        }]
    },
    fridge: {
        type: [{
            ingredientID: mongoose.Schema.Types.ObjectId,
            quantity: Number,
            unit: String,
            expirationDate: Date
        }]
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
