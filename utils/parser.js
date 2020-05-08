export const parseRecipePage = function($) {
    const { recipeJSON, ingredientsJSON } = getJSONLinkedData($)

    return {
        title: recipeJSON.name,
        author: recipeJSON.author,
        budget: getItemTitle($('.recipe-infos__budget > span').get()),
        difficulty: getItemTitle($('.recipe-infos__level > span').get()),
        recipeQuantity: getRecipeQuantity($),
        totalTime: getTime(recipeJSON.totalTime),
        timingDetails: {
            cooking: getTime(recipeJSON.cookTime),
            preparation: getTime(recipeJSON.prepTime),
            rest: getTime(recipeJSON.totalTime) - (getTime(recipeJSON.cookTime) + getTime(recipeJSON.prepTime))
        },
        tags: getTags($),
        fame: getFame($),
        picture: recipeJSON.image,
        ingredients: getIngredients($, ingredientsJSON),
        utensils: getUtensils($),
        recipe: recipeJSON.recipeInstructions.map(step => step.text.trim())
    }
}

const getJSONLinkedData = function($) {
    const ldScripts = $('script[type="application/ld+json"]').get()

    let recipeJSON = null, ingredientsJSON = null
    for(const ldScript of ldScripts) {
        let script = ldScript
        let data = script.children[0].data.trim()
        const jsonLD = JSON.parse(data)
        if(jsonLD.hasOwnProperty("@type") && jsonLD["@type"] === "BreadcrumbList") {
            script = script.next
            while(script.type === "text" || !script.children[0].data.trim().includes('Mrtn.recipesData')) {
                script = script.next
            }
            data = script.children[0].data.trim()
            const json = JSON.parse(data.substring(42, data.length - 1))
            ingredientsJSON = json.recipes[0].ingredients
        } else if(jsonLD.hasOwnProperty("@type") && jsonLD["@type"] === "Recipe") {
            recipeJSON = jsonLD
            break
        }
    }
    return {recipeJSON, ingredientsJSON}
}

const getRecipeQuantity = function($) {
    const recipeQuantitySpan = $('.recipe-infos__quantity > span').get()
    let unit = '', value = 0
    for(const span of recipeQuantitySpan) {
        if(span.attribs.class === 'recipe-infos__item-title') {
            unit = span.children[0].data.trim()
        } else if(span.attribs.class === 'title-2 recipe-infos__quantity__value') {
            value = parseInt(span.children[0].data.trim())
        }
    }
    return { unit: unit, value: value }
}

const getItemTitle = function(itemSpans) {
    for(const span of itemSpans) {
        if(span.attribs.class === 'recipe-infos__item-title') {
            return span.children[0].data.trim().toLowerCase()
        }
    }
    return ''
}

const getTags = function($) {
    return $('.mrtn-tags-list > li').map((i, elem) => $(elem).text().trim()).get()
}

const getFame = function($) {
    const spans = $('.recipe-infos-users__notebook > span').get()
    for(const span of spans) {
        if(span.attribs.class === 'recipe-infos-users__value') {
            const text = span.children[0].data.trim()
            if(text.endsWith('k')) {
                return parseFloat(text.substring(0, text.length - 1)) * 1000
            } else {
                return parseInt(text)
            }
        }
    }
    return 0
}

const getUtensils = function($) {
    const utensils = []
    $('.recipe-utensils__list > li').each((i, elem) => {
        utensils.push({
            picture: $(elem).find('img').attr('src'),
            utensilName: $(elem).find('.recipe-utensil__name').text().trim()
        })
    })
    return utensils
}

const getIngredients = function($, ingredientsJSON) {
    const ingredientsRaw = []
    $('.recipe-ingredients__list > li').each((i, elem) => {
        ingredientsRaw.push({
            picture: $(elem).find('img').attr('src'),
            quantity: $(elem).find('.recipe-ingredient-qt').text().trim(),
            ingredient: $(elem).find('.ingredient').text().trim().toLowerCase(),
            ingredientSingular: $(elem).find('.name_singular').attr('data-name-singular').trim().toLowerCase(),
            complement: $(elem).find('.recipe-ingredient__complement').text().trim().toLowerCase()
        })
    })

    const ingredients = []
    for(const ingredient of ingredientsJSON) {
        const index = ingredientsRaw.findIndex(
            item => item.ingredientSingular.includes(ingredient.name.toLowerCase()))
        ingredients.push({
            display: ingredientsRaw[index].quantity.concat(' ')
                .concat(ingredientsRaw[index].ingredient).concat(' ')
                .concat(ingredientsRaw[index].complement).trim(),
            ingredientName: ingredient.name.toLowerCase(),
            quantity: ingredient.qty,
            unit: ingredient.unit.toLowerCase(),
            complement: ingredientsRaw[index].complement,
            picture: ingredientsRaw[index].picture
        })
    }
    return ingredients
}

const getTime = function(str) {
    if(!str) { return 0 }
    return parseInt(str.substring(2, str.length -1))
}