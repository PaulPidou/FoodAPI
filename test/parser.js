/* global describe it afterEach */

import cheerio from 'cheerio'
import chai from 'chai'
import path from 'path'
import fs from 'fs'

import {parseRecipePage} from '../utils/parser'

chai.should()

describe('utils/parser', function() {

    it('parseRecipePage()', function() {
        const recipePage = fs.readFileSync(path.join(__dirname, 'mockdata', 'recipe.html'))
        const $ = cheerio.load(recipePage)

        const parsedRecipe = parseRecipePage($)
        parsedRecipe.should.be.a('object')
        parsedRecipe.title.should.be.equal('Cannelés croustillants et bien dorés')
        parsedRecipe.ingredients.should.have.lengthOf(9)
        parsedRecipe.utensils.should.have.lengthOf(4)
        parsedRecipe.recipe.should.have.lengthOf(9)
    })

})