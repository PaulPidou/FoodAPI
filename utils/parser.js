export const parseRecipePage = function($) {
    const { recipeJSON, ingredientsJSON } = getJSONLinkedData($)
    const recipeQuantity = getRecipeQuantity($)
    parseRecipe(recipeJSON, ingredientsJSON, recipeQuantity)
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
            while(script.type === "text") { script = script.next }
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
            value = span.children[0].data.trim()
        }
    }
    return { unit: unit, value: value }
}

const parseRecipe = function(recipeJSON, ingredientsJSON, recipeQuantity) {
    const recipe = {
        title: recipeJSON.name,
        author: recipeJSON.author,
        budget: null,
        difficulty: null,
        recipeQuantity: recipeQuantity,
        totalTime: getTime(recipeJSON.totalTime),
        timingDetails: {
            cooking: getTime(recipeJSON.cookTime),
            preparation: getTime(recipeJSON.prepTime),
            rest: getTime(recipeJSON.totalTime) - (getTime(recipeJSON.cookTime) + getTime(recipeJSON.prepTime))
        },
        tags: null,
        fame: null,
        picture: recipeJSON.image,
        ingredients: null,
        utensils: null,
        recipe: recipeJSON.recipeInstructions.map(step => step.text)
    }
    console.log(recipe)
}

const getTime = function(str) {
    if(!str) { return 0 }
    return parseInt(str.substring(2, str.length -1))
}