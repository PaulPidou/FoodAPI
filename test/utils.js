/* global describe it afterEach */

import chai from 'chai'
import sinon from 'sinon'
import 'sinon-mongoose'

import Recipe from '../models/recipe'
import User from '../models/user'
import { removeCookedIngredients, getItemsFromShoppingList, getItemsFromFridge, handleListDependencies } from '../utils/user'

chai.should()

describe('utils/users - handleListDependencies', function() {
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
            fridge: {
                toObject: function() { return [] }
            },
            shoppingList: {
                toObject: function() { return [] },
                map: function() { return [] }
            },
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

    it('handleListDependencies(SAVE_RECIPES) - Complex', async function() {
        const user = {
            _id: "5d1f7df9df5a80e5e1fd3eb6",
            savedRecipes: [{
                recipeID: "5d24c810fee493ef6c987d6f",
                savingDate: 1563386356410
            }],
            fridge: {
                toObject: function() {
                    return [{
                        ingredientID: "5d24c811fee493ef6c987d72",
                        ingredientName: "beurre",
                        quantities: [{ unit:"g", quantity: 5 }]
                    }]}
            },
            shoppingList: {
                toObject: function() {
                    return [{
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
                        quantities: [{ unit:"g", quantity: 5 }]
                    }, {
                        ingredientID: "5d24c811fee493ef6c987d73",
                        ingredientName: "sucre vanillé",
                        quantities: [{ unit:"sachet", quantity: 1 }]
                    }]},
                map: function() {
                    return ["5d24c810fee493ef6c987d70", "5d24c811fee493ef6c987d71",
                        "5d24c811fee493ef6c987d72", "5d24c811fee493ef6c987d73",]}
            },
            save: function() {}
        }
        const recipes = [
            {
                _id: "5d24c810fee493ef6c987d6f",
                ingredients: [
                    {
                        "ingredientName": "tortilla",
                        "unit": "",
                        "quantity": 1,
                        "ingredientID": "5d24c810fee493ef6c987d70"
                    },
                    {
                        "ingredientName": "abricot",
                        "unit": "",
                        "quantity": 6,
                        "ingredientID": "5d24c811fee493ef6c987d71"
                    },
                    {
                        "ingredientName": "beurre",
                        "unit": "g",
                        "quantity": 10,
                        "ingredientID": "5d24c811fee493ef6c987d72"
                    },
                    {
                        "ingredientName": "sucre vanillé",
                        "unit": "sachet",
                        "quantity": 2,
                        "ingredientID": "5d24c811fee493ef6c987d73"
                    }
                ]
            },
            {
                _id: "5d24c850fee493ef6c987d77",
                ingredients: [
                    {
                        "ingredientName": "oeuf",
                        "unit": "",
                        "quantity": 3,
                        "ingredientID": "5d24c865fee493ef6c987d82"
                    },
                    {
                        "ingredientName": "abricot",
                        "unit": "g",
                        "quantity": 400,
                        "ingredientID": "5d24c811fee493ef6c987d71"
                    },
                    {
                        "ingredientName": "beurre",
                        "unit": "g",
                        "quantity": 10,
                        "ingredientID": "5d24c811fee493ef6c987d72"
                    }
                ]
            }
        ]

        const mockFind = {
            select: function () {
                return this
            },
            exec: sinon.stub().resolves([recipes[0]])
        }

        const s = sinon.stub(Recipe, 'find')
        s.withArgs({_id: { $in: [recipes[0]._id] }})
            .returns(mockFind)

        s.withArgs({_id: { $in: recipes.map(r => r._id) }})
            .returns({
                ...mockFind,
                exec: sinon.stub().resolves(recipes)
            })

        sinon.mock(User)
            .expects('findById')
            .withArgs(user._id)
            .resolves(user)

        await handleListDependencies(user, 'SAVE_RECIPES', [recipes[1]._id])
        user.savedRecipes.should.have.lengthOf(2)
        user.shoppingList.should.have.lengthOf(5)
        user.shoppingList[0].ingredientName.should.be.equal('tortilla')
        user.shoppingList[0].quantities.should.deep.equal([{ unit: '', quantity: 1 }])
        user.shoppingList[1].ingredientName.should.be.equal('abricot')
        user.shoppingList[1].quantities.should.deep.equal([{ unit: '', quantity: 6 }, { unit: 'g', quantity: 400 }])
        user.shoppingList[2].ingredientName.should.be.equal('beurre')
        user.shoppingList[2].quantities.should.deep.equal([{ unit: 'g', quantity: 15 }])
        user.shoppingList[3].ingredientName.should.be.equal('sucre vanillé')
        user.shoppingList[3].quantities.should.deep.equal([{ unit: 'sachet', quantity: 1 }])
        user.shoppingList[4].ingredientName.should.be.equal('oeuf')
        user.shoppingList[4].quantities.should.deep.equal([{ unit: '', quantity: 3 }])
    })

    it('handleListDependencies(SAVE_RECIPES) - Handle associatedProduct', async function() {
        const user = {
            _id: "5d1f7df9df5a80e5e1fd3eb6",
            savedRecipes: [{
                recipeID: "5d24c810fee493ef6c987d6f",
                savingDate: 1563386356410
            }],
            fridge: {
                toObject: function() {
                    return [{
                        ingredientID: "5d24c811fee493ef6c987d72",
                        ingredientName: "beurre",
                        quantities: [{ unit:"g", quantity: 5 }]
                    }]}
            },
            shoppingList: {
                toObject: function() {
                    return [{
                        ingredientID: "5d24c810fee493ef6c987d70",
                        ingredientName: "tortilla",
                        quantities: [{ unit: "", quantity: 1 }]
                    }, {
                        ingredientID: "5d24c811fee493ef6c987d71",
                        ingredientName: "abricot",
                        quantities: [{ unit: "", quantity: 6 }],
                        associatedProduct: {
                            productID: "123",
                            name: "Abricot",
                            brand: "Du jardin",
                            nutriscore: "a"
                        }
                    },{
                        ingredientID: "5d24c811fee493ef6c987d72",
                        ingredientName: "beurre",
                        quantities: [{ unit:"g", quantity: 5 }]
                    }, {
                        ingredientID: "5d24c811fee493ef6c987d73",
                        ingredientName: "sucre vanillé",
                        quantities: [{ unit:"sachet", quantity: 1 }],
                        associatedProduct: {
                            productID: "123",
                            name: "Sucre Vahiné",
                            brand: "Vahiné",
                            nutriscore: "b"
                        }
                    }]},
                map: function() {
                    return ["5d24c810fee493ef6c987d70", "5d24c811fee493ef6c987d71",
                        "5d24c811fee493ef6c987d72", "5d24c811fee493ef6c987d73",]}
            },
            save: function() {}
        }
        const recipes = [
            {
                _id: "5d24c810fee493ef6c987d6f",
                ingredients: [
                    {
                        "ingredientName": "tortilla",
                        "unit": "",
                        "quantity": 1,
                        "ingredientID": "5d24c810fee493ef6c987d70"
                    },
                    {
                        "ingredientName": "abricot",
                        "unit": "",
                        "quantity": 6,
                        "ingredientID": "5d24c811fee493ef6c987d71"
                    },
                    {
                        "ingredientName": "beurre",
                        "unit": "g",
                        "quantity": 10,
                        "ingredientID": "5d24c811fee493ef6c987d72"
                    },
                    {
                        "ingredientName": "sucre vanillé",
                        "unit": "sachet",
                        "quantity": 2,
                        "ingredientID": "5d24c811fee493ef6c987d73"
                    }
                ]
            },
            {
                _id: "5d24c850fee493ef6c987d77",
                ingredients: [
                    {
                        "ingredientName": "oeuf",
                        "unit": "",
                        "quantity": 3,
                        "ingredientID": "5d24c865fee493ef6c987d82"
                    },
                    {
                        "ingredientName": "abricot",
                        "unit": "g",
                        "quantity": 400,
                        "ingredientID": "5d24c811fee493ef6c987d71"
                    },
                    {
                        "ingredientName": "beurre",
                        "unit": "g",
                        "quantity": 10,
                        "ingredientID": "5d24c811fee493ef6c987d72"
                    }
                ]
            }
        ]

        const mockFind = {
            select: function () {
                return this
            },
            exec: sinon.stub().resolves([recipes[0]])
        }

        const s = sinon.stub(Recipe, 'find')
        s.withArgs({_id: { $in: [recipes[0]._id] }})
            .returns(mockFind)

        s.withArgs({_id: { $in: recipes.map(r => r._id) }})
            .returns({
                ...mockFind,
                exec: sinon.stub().resolves(recipes)
            })

        sinon.mock(User)
            .expects('findById')
            .withArgs(user._id)
            .resolves(user)

        await handleListDependencies(user, 'SAVE_RECIPES', [recipes[1]._id])
        user.savedRecipes.should.have.lengthOf(2)
        user.shoppingList.should.have.lengthOf(5)
        user.shoppingList[0].ingredientName.should.be.equal('tortilla')
        user.shoppingList[0].quantities.should.deep.equal([{ unit: '', quantity: 1 }])
        user.shoppingList[1].ingredientName.should.be.equal('abricot')
        user.shoppingList[1].quantities.should.deep.equal([{ unit: '', quantity: 6 }, { unit: 'g', quantity: 400 }])
        user.shoppingList[1].associatedProduct.should.be.a('object')
        user.shoppingList[2].ingredientName.should.be.equal('beurre')
        user.shoppingList[2].quantities.should.deep.equal([{ unit: 'g', quantity: 15 }])
        user.shoppingList[3].ingredientName.should.be.equal('sucre vanillé')
        user.shoppingList[3].quantities.should.deep.equal([{ unit: 'sachet', quantity: 1 }])
        user.shoppingList[3].associatedProduct.should.be.a('object')
        user.shoppingList[4].ingredientName.should.be.equal('oeuf')
        user.shoppingList[4].quantities.should.deep.equal([{ unit: '', quantity: 3 }])
    })

    it('handleListDependencies(REMOVE_RECIPES) - Basic', async function() {
        const user = {
            _id: "5d1f7df9df5a80e5e1fd3eb6",
            savedRecipes:[{
                recipeID: "5d24c810fee493ef6c987d6f",
                savingDate: 1563386356410
            }],
            fridge: {
                toObject: function() { return [] }
            },
            shoppingList: {
                toObject: function() {
                    return [{
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
                    }]},
                map: function() {
                    return ["5d24c810fee493ef6c987d70", "5d24c811fee493ef6c987d71",
                        "5d24c811fee493ef6c987d72", "5d24c811fee493ef6c987d73"]
                }
            },
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

describe('utils/users - others', function() {
    it('removeCookedIngredients()', async function() {
        const user = {
            _id: "5d1f7df9df5a80e5e1fd3eb6",
            savedRecipes: [{
                recipeID: "5d24c810fee493ef6c987d6f",
                savingDate: 1563386356410
            }],
            shoppingList: [],
            fridge: {
                toObject: function() {
                    return [{
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
                        quantities: [{ unit:"g", quantity: 5 }]
                    }, {
                        ingredientID: "5d24c811fee493ef6c987d73",
                        ingredientName: "sucre vanillé",
                        quantities: [{ unit:"sachet", quantity: 1 }]
                    }]}
            },
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

        sinon.mock(Recipe)
            .expects('find')
            .withArgs({_id: { $in: recipes.map(r => r._id) }})
            .chain('select')
            .withArgs({'ingredients.ingredientID': 1, 'ingredients.ingredientName': 1,
                'ingredients.quantity': 1, 'ingredients.unit': 1})
            .chain('exec')
            .resolves(recipes)

        await removeCookedIngredients(user, recipes.map(r => r._id))
        user.fridge.should.be.empty
    })

    it('getItemsFromShoppingList()', function() {
        const user = {
            shoppingList: [{
                ingredientID: "5d24c810fee493ef6c987d70",
                ingredientName: "tortilla",
                quantities: [{ unit: "", quantity: 1 }]
            }, {
                ingredientID: "5d24c811fee493ef6c987d71",
                ingredientName: "abricot",
                quantities: [{ unit: "", quantity: 6 }]
            }]
        }
        const items = ["5d24c811fee493ef6c987d71"]

        const result = getItemsFromShoppingList(user, items)
        result.should.have.lengthOf(1)
        result[0].should.be.a('object')
        result[0].ingredientID.should.be.equal('5d24c811fee493ef6c987d71')
        result[0].ingredientName.should.be.equal('abricot')
    })

    it('getItemsFromFridge()', function() {
        const user = {
            fridge: [{
                ingredientID: "5d24c810fee493ef6c987d70",
                ingredientName: "tortilla",
                quantities: [{ unit: "", quantity: 1 }]
            }, {
                ingredientID: "5d24c811fee493ef6c987d71",
                ingredientName: "abricot",
                quantities: [{ unit: "", quantity: 6 }]
            }]
        }
        const items = ["5d24c811fee493ef6c987d71"]

        const result = getItemsFromFridge(user, items)
        result.should.have.lengthOf(1)
        result[0].should.be.a('object')
        result[0].ingredientID.should.be.equal('5d24c811fee493ef6c987d71')
        result[0].ingredientName.should.be.equal('abricot')
    })
})