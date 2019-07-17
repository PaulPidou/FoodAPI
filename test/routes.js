/* global describe it */

import chai from 'chai'

import { getCorrespondingItem, combineQuantities, getDiffQuantities, unflatIngredients,
    addNewItems, removeItems } from '../routes/utils'

chai.should()

describe('routes/api_public', function() {

})

describe('routes/api_user', function() {

})

describe('routes/utils', function() {
    it('getCorrespondingItem()', function() {
        const itemList = [
            {
                ingredientID: '123',
                ingredientName: 'A'
            },
            {
                ingredientID: '234',
                ingredientName: 'B'
            }
        ]

        const item = getCorrespondingItem(itemList, '234')
        item.should.have.own.property('ingredientName')
        item.ingredientName.should.equal('B')

    })

    it('combineQuantities()', function() {
        const items = [
            {
                ingredientID: '123',
                ingredientName: 'A',
                quantities: [{unit: 'g', quantity: 100}]
            },
            {
                ingredientID: '123',
                ingredientName: 'A',
                quantities: [{unit: 'g', quantity: 200}]
            },
            {
                ingredientID: '123',
                ingredientName: 'A',
                quantities: [{unit: 'g', quantity: 50}, {unit: '', quantity: 2}]
            }
        ]

        let combinedItem = combineQuantities(items[0], items[1], 'ADD')
        combinedItem.quantities.should.be.a('array')
        combinedItem.quantities[0].quantity.should.be.equal(300)

        combinedItem = combineQuantities(items[0], items[2], 'ADD')
        combinedItem.quantities.should.be.a('array')
        combinedItem.quantities.should.deep.include({unit: 'g', quantity: 150})
        combinedItem.quantities.should.deep.include({unit: '', quantity: 2})

        combinedItem = combineQuantities(items[0], items[1], 'SUBTRACT')
        combinedItem.quantities.should.be.a('array')
        combinedItem.quantities.should.be.empty

        combinedItem = combineQuantities(items[1], items[2], 'SUBTRACT')
        combinedItem.quantities.should.be.a('array')
        combinedItem.quantities.should.deep.include({unit: 'g', quantity: 150})
        combinedItem.quantities.should.deep.not.include({unit: '', quantity: 2})

        combinedItem = combineQuantities(items[2], items[0], 'SUBTRACT')
        combinedItem.quantities.should.be.a('array')
        combinedItem.quantities.should.deep.equal([{unit: '', quantity: 2}])
    })

    it('getDiffQuantities()', function() {
        const items = [
            {
                ingredientID: '123',
                ingredientName: 'A',
                quantities: [{unit: 'g', quantity: 100}]
            },
            {
                ingredientID: '123',
                ingredientName: 'A',
                quantities: [{unit: 'g', quantity: 200}]
            },
            {
                ingredientID: '123',
                ingredientName: 'A',
                quantities: [{unit: 'g', quantity: 50}, {unit: '', quantity: 2}]
            }
        ]

        let diff = getDiffQuantities(items[1], items[0])
        diff.should.have.own.property('toKeep')
        diff.should.have.own.property('toRemove')
        diff.toRemove.should.be.empty
        diff.toKeep.quantities.should.deep.equal([{unit: 'g', quantity: 100}])

        diff = getDiffQuantities(items[0], items[1])
        diff.should.have.own.property('toKeep')
        diff.should.have.own.property('toRemove')
        diff.toKeep.should.be.empty
        diff.toRemove.quantities.should.deep.equal([{unit: 'g', quantity: 100}])

        diff = getDiffQuantities(items[2], items[2])
        diff.should.have.own.property('toKeep')
        diff.should.have.own.property('toRemove')
        diff.toKeep.should.be.empty
        diff.toRemove.should.be.empty

        diff = getDiffQuantities(items[1], items[2])
        diff.should.have.own.property('toKeep')
        diff.should.have.own.property('toRemove')
        diff.toKeep.quantities.should.deep.equal([{unit: 'g', quantity: 150}])
        diff.toRemove.quantities.should.deep.equal([{unit: '', quantity: 2}])
    })

    it('unflatIngredients()', function() {
        const ingredients = [
            {
                ingredientID: '123',
                ingredientName: 'A',
                quantity: 100,
                unit: 'g'
            },
            {
                ingredientID: '123',
                ingredientName: 'A',
                quantity: 200,
                unit: 'g'
            },
            {
                ingredientID: '123',
                ingredientName: 'A',
                quantity: 2,
                unit: ''
            },
            {
                ingredientID: '234',
                ingredientName: 'B',
                quantity: 20,
                unit: 'cl'
            }
        ]

        const unflatted = unflatIngredients(ingredients)
        unflatted.should.have.own.property('123')
        unflatted.should.have.own.property('234')
        unflatted['123'].quantities.should.deep.equal([{unit: 'g', quantity: 300}, {unit: '', quantity: 2}])
        unflatted['234'].quantities.should.deep.equal([{unit: 'cl', quantity: 20}])
    })

    it('addNewItems()', function() {
        const userItems = [
            {
                ingredientID: '123',
                ingredientName: 'A',
                quantities: [{unit: 'g', quantity: 100}]
            }
        ]
        const newItems = [
            {
                ingredientID: '123',
                ingredientName: 'A',
                quantities: [{unit: 'g', quantity: 50}, {unit: '', quantity: 2}]
            },
            {
                ingredientID: '234',
                ingredientName: 'B',
                quantities: [{unit: 'cl', quantity: 20}]
            }
        ]

        let combinedItems = addNewItems(userItems, newItems)
        combinedItems.length.should.be.equal(2)
        combinedItems.should.deep.equal([
            {
                ingredientID: '123',
                ingredientName: 'A',
                quantities: [{unit: 'g', quantity: 150}, {unit: '', quantity: 2}]
            },
            {
                ingredientID: '234',
                ingredientName: 'B',
                quantities: [{unit: 'cl', quantity: 20}]
            }
            ])

        combinedItems = addNewItems(newItems, userItems)
        combinedItems.length.should.be.equal(2)
        combinedItems.should.deep.equal([
            {
                ingredientID: '123',
                ingredientName: 'A',
                quantities: [{unit: 'g', quantity: 150}, {unit: '', quantity: 2}]
            },
            {
                ingredientID: '234',
                ingredientName: 'B',
                quantities: [{unit: 'cl', quantity: 20}]
            }
        ])
    })

    it('removeItems()', function() {
        const items1 = [
            {
                ingredientID: '123',
                ingredientName: 'A',
                quantities: [{unit: 'g', quantity: 100}]
            }
        ]
        const items2 = [
            {
                ingredientID: '123',
                ingredientName: 'A',
                quantities: [{unit: 'g', quantity: 50}, {unit: '', quantity: 2}]
            },
            {
                ingredientID: '234',
                ingredientName: 'B',
                quantities: [{unit: 'cl', quantity: 20}]
            }
        ]

        let combinedItems = removeItems(items1, items2)
        combinedItems.length.should.be.equal(1)
        combinedItems.should.deep.equal([
            {
                ingredientID: '123',
                ingredientName: 'A',
                quantities: [{unit: 'g', quantity: 50}]
            }
        ])

        combinedItems = removeItems(items2, items1)
        combinedItems.length.should.be.equal(2)
        combinedItems.should.deep.equal([
            {
                ingredientID: '123',
                ingredientName: 'A',
                quantities: [{unit: '', quantity: 2}]
            },
            {
                ingredientID: '234',
                ingredientName: 'B',
                quantities: [{unit: 'cl', quantity: 20}]
            }
        ])

    })
})