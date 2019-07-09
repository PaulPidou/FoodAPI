/* global describe it before after*/

import chai from 'chai'
import { getCorrespondingItem, combineQuantities } from '../routes/utils'

chai.should()

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
})