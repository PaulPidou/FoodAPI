export const parseRecipePage = function($) {
    const { recipeJSON, ingredientsJSON } = getJSONLinkedData($)

    const recipe = {
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
    console.log(recipe)
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
    const lis = $('.mrtn-tags-list > li').get()
    const tags = []
    for(const li of lis) {
        const child = li.children[0]
        if(child.type === 'tag' && child.name === 'a') {
            tags.push(child.children[0].data.trim())
        } else if(child.type === 'text') {
            tags.push(child.data.trim())
        }
    }
    return tags
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

const getIngredients = function($, ingredientsJSON) {
    const ingredientsLi = $('.recipe-ingredients__list > li').get()

    const ingredientsRaw = []
    for(const li of ingredientsLi) {
        let picture = '', quantity = '', ingredient = '', ingredientSingular = '', complement = ''
        for(const child of li.children) {
            if(child.type === 'tag' && child.name === 'div') {
                for(const divChild of child.children) {
                    if(divChild.type === 'tag' && divChild.name === 'span') {
                        switch(divChild.attribs.class) {
                            case 'recipe-ingredient-qt':
                                quantity = divChild.children[0].data.trim()
                                break
                            case 'ingredient':
                                ingredient = divChild.children[0].data.trim()
                                break
                            case 'recipe-ingredient__complement':
                                complement = divChild.children[0].data.trim()
                                break
                        }
                    } else if(divChild.type === 'tag' && divChild.name === 'p') {
                        if(divChild.attribs.class === 'name_singular') {
                            ingredientSingular = divChild.attribs['data-name-singular'].trim()
                        }
                    }
                }
            } else if(child.type === 'tag' && child.name === 'img') {
                picture = child.attribs.src
            }
        }
        ingredientsRaw.push({
            picture: picture,
            quantity: quantity,
            ingredient: ingredient,
            ingredientSingular: ingredientSingular,
            complement: complement
        })
    }

    const ingredients = []
    for(const ingredient of ingredientsJSON) {
        const index = ingredientsRaw.findIndex(item => item.ingredientSingular.includes(ingredient.name))
        ingredients.push({
            display: ingredientsRaw[index].quantity.concat(' ')
                .concat(ingredientsRaw[index].ingredient).concat(' ')
                .concat(ingredientsRaw[index].complement).trim(),
            ingredientName: ingredient.name,
            quantity: ingredient.qty,
            unit: ingredient.unit,
            complement: ingredientsRaw[index].complement,
            picture: ingredientsRaw[index].picture
        })
    }
    return ingredients
}

const getUtensils = function($) {
    const utensilsLi = $('.recipe-utensils__list > li').get()
    const utensils = []
    for(const utensil of utensilsLi) {
        let utensilName = '', picture = ''
        for(const child of utensil.children) {
            if(child.type === 'tag' && child.name === 'span') {
                utensilName = child.children[0].data.trim()
            } else if(child.type === 'tag' && child.name === 'img') {
                picture = child.attribs.src
            }
        }
        utensils.push({ utensilName: utensilName, picture: picture })
    }
    return utensils
}

const getTime = function(str) {
    if(!str) { return 0 }
    return parseInt(str.substring(2, str.length -1))
}