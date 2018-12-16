import mongoose from 'mongoose'

const IngredientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    recipes: {
        type: [mongoose.Schema.Types.ObjectId]
    }
})

IngredientSchema.methods.toJSON = function() {
    const obj = this.toObject()
    if (obj.hasOwnProperty('__v')) { delete obj.__v }
    return obj
}

const Ingredient = mongoose.model('Ingredient', IngredientSchema)

export default Ingredient