import mongoose from 'mongoose'
import mongoosastic from 'mongoosastic'
import Ingredient from './ingredients'

import log from 'log4js'
const logger = log.getLogger()

const IngredientSchema = new mongoose.Schema({
    display: {
        type: String,
        required: true
    },
    ingredientName: {
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
    utensilName: {
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
    hashId: {
        type: String,
        index: true,
        unique: true
    },
    title: {
        type: String,
        index: true,
        es_indexed: true,
        required: true
    },
    author: { type: String, index: true },
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
    tags: { type: [String], index: true },
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
        const ingredient = await Ingredient.findOne({name: recipeIngredient.ingredientName}).exec()
        if(ingredient) {
            recipeIngredient_cpy.ingredientID = ingredient._id
            await Ingredient.findByIdAndUpdate(ingredient._id, {$addToSet: {'units': recipeIngredient.unit.toLowerCase()}})
        } else {
            recipeIngredient_cpy.ingredientID = await new Ingredient({
                name: recipeIngredient.ingredientName,
                picture: recipeIngredient.picture,
                units: [recipeIngredient.unit.toLowerCase()]
            }).save()
        }
        ingredients.push(recipeIngredient_cpy)
    }
    recipe.ingredients = ingredients
    next()
})

RecipeSchema.post('save', async function() {
    const recipe = this

    for (const recipeIngredient of recipe.ingredients) {
        const ingredient = await Ingredient.findOne({name: recipeIngredient.ingredientName}).exec()
        if (ingredient) {
            await Ingredient.findByIdAndUpdate(ingredient._id, {$push: {'recipes': recipe._id}})
        }
    }
})

RecipeSchema.pre('remove', async function(next) {
    const recipe = this

    for (const recipeIngredient of recipe.ingredients) {
        Ingredient.findByIdAndUpdate(recipeIngredient.ingredientID,
            { $pull: { "recipes": recipe._id } }, {'new': true}
        ).exec(function(err, ingredient) {
            if (err || !ingredient) {
                logger.error("Issue while removing recipe " + recipe._id + " from ingredient " + recipeIngredient.ingredientID)
            }
            next()
        })
    }
})

RecipeSchema.methods.toJSON = function() {
    const obj = this.toObject()
    if (obj.hasOwnProperty('__v')) { delete obj.__v }
    return obj
}

RecipeSchema.plugin(mongoosastic, { host: process.env.ELASTIC_HOST || '127.0.0.1' })
const Recipe = mongoose.model('Recipe', RecipeSchema)

// TO REINDEX RECIPES IN ELASTICSEARCH
/*
const stream = Recipe.synchronize()
let count = 0

stream.on('data', function(err, doc){
    count++
})
stream.on('close', function(){
    logger.log('Indexed ' + count + ' documents!')
})
stream.on('error', function(err){
    logger.error(err)
})
 */

export default Recipe