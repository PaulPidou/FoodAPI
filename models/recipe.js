import mongoose from 'mongoose'
import mongoosastic from 'mongoosastic'
import Ingredient from './ingredients'

const IngredientSchema = new mongoose.Schema({
    display: {
        type: String,
        required: true
    },
    ingredient: {
        type: String,
        required: true
    },
    ingredientID: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    quantity: {
        type: Number
    },
    unit: {
        type: String
    },
    complement: {
        type: String
    },
    picture: {
        type: String
    }
}, { _id : false })

const UtensilSchema = new mongoose.Schema({
    utensil: {
        type: String,
        required: true
    },
    picture: {
        type: String
    }
}, { _id : false })

const RecipeQuantity = new mongoose.Schema({
    unit: {
        type: String
    },
    value: {
        type: Number
    }
}, { _id : false })

const timingDetails = new mongoose.Schema({
    preparation: {
        type: Number
    },
    cooking: {
        type: Number
    },
    rest: {
        type: Number
    }
}, { _id : false })

const RecipeSchema = new mongoose.Schema({
    title: {
        type: String,
        es_indexed:true,
        required: true
    },
    author: { type: String },
    budget: {
        type: String,
        enum: ['bon marché', 'coût moyen', 'assez cher']
    },
    difficulty: {
        type: String,
        enum: ['très facile', 'facile', 'niveau moyen', 'difficile']
    },
    recipeQuantity: RecipeQuantity,
    totalTime: { type: Number },
    timingDetails: timingDetails,
    tags: [String],
    fame: {
        type: Number,
        default: 0
    },
    picture: { type: String },
    ingredients: [IngredientSchema],
    utensils: [UtensilSchema],
    recipe: [String]
})

RecipeSchema.pre('validate', async function(next) {
    const recipe = this

    let ingredients = []
    for (const recipeIngredient of recipe.ingredients) {
        let recipeIngredient_cpy = JSON.parse(JSON.stringify(recipeIngredient))
        const ingredient = await Ingredient.findOne({name: recipeIngredient.ingredient}).exec()
        if(ingredient) {
            recipeIngredient_cpy.ingredientID = ingredient._id
        } else {
            recipeIngredient_cpy.ingredientID = await new Ingredient({name: recipeIngredient.ingredient}).save()
        }
        ingredients.push(recipeIngredient_cpy)
    }
    recipe.ingredients = ingredients
    next()
})

RecipeSchema.post('save', async function() {
    const recipe = this

    for (const recipeIngredient of recipe.ingredients) {
        const ingredient = await Ingredient.findOne({name: recipeIngredient.ingredient}).exec()
        if (ingredient) {
            await Ingredient.findByIdAndUpdate(ingredient._id, {$push: {'recipes': recipe._id}})
        }
    }
})

RecipeSchema.methods.toJSON = function() {
    const obj = this.toObject()
    if (obj.hasOwnProperty('__v')) { delete obj.__v }
    return obj
}

RecipeSchema.plugin(mongoosastic)
const Recipe = mongoose.model('Recipe', RecipeSchema)

export default Recipe