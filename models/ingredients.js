import mongoose from 'mongoose'

const SubstituteSchema = new mongoose.Schema({
    ingredientID: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    ingredientName: {
        type: String,
        required: true
    },
    similarityScore: {
        type: Number,
        required: true
    }
}, { _id : false })

const SeasonSchema = new mongoose.Schema({
    fullSeason: [String],
    available: [String],
    unavailable: [String]
}, { _id : false })

const IngredientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    picture: {
        type: String
    },
    units: {
        type:[String]
    },
    substitutes: [SubstituteSchema],
    season: SeasonSchema,
    recipes: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Recipe'
    },
    products: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Product'
    }
})

IngredientSchema.methods.toJSON = function() {
    const obj = this.toObject()
    if (obj.hasOwnProperty('__v')) { delete obj.__v }
    return obj
}

const Ingredient = mongoose.model('Ingredient', IngredientSchema)

export default Ingredient