/* global describe it before after*/

import chai from 'chai'
import User from '../models/user'

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

})

describe('models/ingredients', function() {

})