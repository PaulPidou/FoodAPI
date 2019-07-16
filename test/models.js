/* global describe it before after*/

import chai from 'chai'
import User from '../models/user'
import Recipe from '../models/recipe'
import Ingredient from '../models/ingredients'

chai.should()
const expect = chai.expect

describe('models/user', function() {
    it('Check for a valid email', function(done) {
        const user = new User({
            email: 'falseEmail',
            password: 'pass'
        })

        user.validate(function(err) {
            expect(err.errors.email).to.exist
            done()
        })
    })

    it('Check for missing password', function(done) {
        const user = new User({
            email: 'test@test.com'
        })

        user.validate(function(err) {
            expect(err.errors.password).to.exist
            done()
        })
    })

    it('Check toJSON method', function() {
        const user = new User({
            email: 'test@test.com',
            password: 'pass'
        })

        const userObj = user.toJSON()
        userObj.should.be.a('object')
        expect(userObj.password).to.be.undefined
    })
})

describe('models/recipe', function() {
    it('Check toJSON method', function() {
        const recipe = new Recipe({
            title: 'MyRecipe'
        })

        const recipeObj = recipe.toJSON()
        recipeObj.should.be.a('object')
        expect(recipeObj.__v).to.be.undefined
    })
})

describe('models/ingredients', function() {
    it('Check toJSON method', function() {
        const ingredient = new Ingredient({
            name: 'MyIngredient'
        })

        const ingredientObj = ingredient.toJSON()
        ingredientObj.should.be.a('object')
        expect(ingredientObj.__v).to.be.undefined
    })
})