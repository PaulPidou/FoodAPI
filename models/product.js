import mongoose from 'mongoose'
import Ingredient from "./ingredients"

import log from 'log4js'
const logger = log.getLogger()

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    picture: {
        type: String
    },
    brand: {
        type: String,
        required: true
    },
    nutriscore: {
        type: String
    },
    novaGroup: {
        type: Number
    },
    OFFUrl: {
        type: String,
        required: true
    },
    ingredient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ingredient'
    }
})

ProductSchema.post('save', async function() {
    const product = this
    await Ingredient.findByIdAndUpdate(product.ingredient, {$push: {'products': product._id}}).exec()
})

ProductSchema.pre('remove', async function(next) {
    const product = this

    Ingredient.findByIdAndUpdate(product.ingredient,
        { $pull: { 'products': product._id } }, {'new': true}
        ).exec(function(err, ingredient) {
            if (err || !ingredient) {
                logger.error("Issue while removing product " + product._id + " from ingredient " + product.ingredient)
            }
            next()
        })
})

ProductSchema.methods.toJSON = function() {
    const obj = this.toObject()
    if (obj.hasOwnProperty('__v')) { delete obj.__v }
    return obj
}

const Product = mongoose.model('Product', ProductSchema)

export default Product