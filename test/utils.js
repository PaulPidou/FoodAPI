/* global describe it afterEach */

import chai from 'chai'
import sinon from 'sinon'
import 'sinon-mongoose'

import Recipe from '../models/recipe'
import User from '../models/user'
import { handleListDependencies } from '../utils/user'

chai.should()

describe('utils/users', function() {
    afterEach(function() {
        Recipe.find.restore()
        User.findById.restore()
        if(User.hasOwnProperty('findByIdAndUpdate')) {
            User.findByIdAndUpdate.restore()
        }
    })

    it('handleListDependencies(SAVE_RECIPES) - Basic', async function() {
        const user = {
            _id: "5d1f7df9df5a80e5e1fd3eb6",
            savedRecipes: [],
            fridge: [],
            shoppingList: [],
            save: function() {}
        }
        const recipes = [
            {
                _id: "5d24c810fee493ef6c987d6f",
                ingredients: [
                    {
                        "ingredientName":"tortilla",
                        "unit":"",
                        "quantity":1,
                        "ingredientID":"5d24c810fee493ef6c987d70"
                    },
                    {
                        "ingredientName":"abricot",
                        "unit":"",
                        "quantity":6,
                        "ingredientID":"5d24c811fee493ef6c987d71"
                    },
                    {
                        "ingredientName":"beurre",
                        "unit":"g",
                        "quantity":10,
                        "ingredientID":"5d24c811fee493ef6c987d72"
                    },
                    {
                        "ingredientName":"sucre vanillé",
                        "unit":"sachet",
                        "quantity":2,
                        "ingredientID":"5d24c811fee493ef6c987d73"
                    }
                    ]
            }
        ]

        const mockFind = {
            select: function () {
                return this
            },
            exec: sinon.stub().resolves([])
        }

        const s = sinon.stub(Recipe, 'find')
        s.withArgs({_id: { $in: [] }})
            .returns(mockFind)

        s.withArgs({_id: { $in: [recipes[0]._id] }})
            .returns({
                ...mockFind,
                exec: sinon.stub().resolves(recipes)
            })

        sinon.mock(User)
            .expects('findById')
            .withArgs(user._id)
            .resolves(user)

        await handleListDependencies(user, 'SAVE_RECIPES', [recipes[0]._id])
        user.savedRecipes.should.have.lengthOf(1)
        user.savedRecipes[0].recipeID.should.be.equal(recipes[0]._id)
        user.shoppingList.should.have.lengthOf(4)
    })

    it('handleListDependencies(REMOVE_RECIPES) - Basic', async function() {
        let user = {
            _id: "5d1f7df9df5a80e5e1fd3eb6",
            savedRecipes:[{
                recipeID: "5d24c810fee493ef6c987d6f",
                savingDate: 1563386356410
            }],
            fridge: [],
            shoppingList: [{
                ingredientID: "5d24c810fee493ef6c987d70",
                ingredientName: "tortilla",
                quantities: [{ unit: "", quantity: 1 }]
            }, {
                ingredientID: "5d24c811fee493ef6c987d71",
                ingredientName: "abricot",
                quantities: [{ unit: "", quantity: 6 }]
            },{
                ingredientID: "5d24c811fee493ef6c987d72",
                ingredientName: "beurre",
                quantities: [{ unit:"g", quantity: 10 }]
            }, {
                ingredientID: "5d24c811fee493ef6c987d73",
                ingredientName: "sucre vanillé",
                quantities: [{ unit:"sachet", quantity: 2 }]
            }],
            save: function() {}
        }
        const recipes = [
            {
                _id: "5d24c810fee493ef6c987d6f",
                ingredients: [
                    {
                        "ingredientName":"tortilla",
                        "unit":"",
                        "quantity":1,
                        "ingredientID":"5d24c810fee493ef6c987d70"
                    },
                    {
                        "ingredientName":"abricot",
                        "unit":"",
                        "quantity":6,
                        "ingredientID":"5d24c811fee493ef6c987d71"
                    },
                    {
                        "ingredientName":"beurre",
                        "unit":"g",
                        "quantity":10,
                        "ingredientID":"5d24c811fee493ef6c987d72"
                    },
                    {
                        "ingredientName":"sucre vanillé",
                        "unit":"sachet",
                        "quantity":2,
                        "ingredientID":"5d24c811fee493ef6c987d73"
                    }
                ]
            }
        ]

        const mockFind = {
            select: function () {
                return this
            },
            exec: sinon.stub().resolves([])
        }

        const s = sinon.stub(Recipe, 'find')
        s.withArgs({_id: { $in: [recipes[0]._id] }})
            .returns({
                ...mockFind,
                exec: sinon.stub().resolves(recipes)
            })

        s.withArgs({_id: { $in: [] }})
            .returns(mockFind)

        sinon.mock(User)
            .expects('findByIdAndUpdate')
            .withArgs(user._id,
                { $pull: { "savedRecipes": {"recipeID": {$in: [recipes[0]._id]}}}}, {'multi': true, 'new': true})
            .chain('exec')
            .resolves(true)

        sinon.mock(User)
            .expects('findById')
            .withArgs(user._id)
            .resolves({
                ...user,
                savedRecipes: []
            })

        await handleListDependencies(user, 'REMOVE_RECIPES', [recipes[0]._id])
        user.shoppingList.should.have.lengthOf(0)
    })
})