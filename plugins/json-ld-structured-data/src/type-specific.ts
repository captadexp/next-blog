/**
 * Type-specific field handlers for complex schema types
 */
import {JsonLdOverrides, JsonLdSchema} from './types.js';
import {parseCustomJson, sanitizeString, sanitizeUrl} from './validators.js';

/**
 * Add Review-specific fields
 */
export function addReviewFields(jsonLd: JsonLdSchema, overrides: JsonLdOverrides): JsonLdSchema {
    if (!overrides.review) return jsonLd;

    const {itemName, itemType, imageMedia, rating} = overrides.review;

    if (!itemName) {
        throw new Error('Review requires itemName');
    }

    jsonLd.itemReviewed = {
        '@type': itemType || 'Thing',
        name: sanitizeString(itemName)
    };

    const imageUrl = sanitizeUrl(imageMedia?.url);
    if (imageUrl) {
        jsonLd.itemReviewed.image = imageUrl;
    }

    if (!rating?.value) {
        throw new Error('Review requires rating value');
    }

    jsonLd.reviewRating = {
        '@type': 'Rating',
        ratingValue: rating.value,
        bestRating: rating.best || 5,
        worstRating: rating.worst || 1
    };

    return jsonLd;
}

/**
 * Add HowTo-specific fields
 */
export function addHowToFields(jsonLd: JsonLdSchema, overrides: JsonLdOverrides): JsonLdSchema {
    const howTo = overrides.howTo || {};

    if (howTo.totalTime) jsonLd.totalTime = sanitizeString(howTo.totalTime);
    if (howTo.estimatedCost) jsonLd.estimatedCost = sanitizeString(howTo.estimatedCost);

    if (howTo.tools?.length) {
        jsonLd.tool = howTo.tools.map((tool: string) => ({
            '@type': 'HowToTool',
            name: sanitizeString(tool)
        }));
    }

    // Steps are required for HowTo
    if (!howTo.steps?.length) {
        throw new Error('HowTo requires at least one step');
    }

    jsonLd.step = howTo.steps.map((step: any, i: number) => {
        if (!step.text) {
            throw new Error(`HowTo step ${i + 1} requires text`);
        }

        const stepObj: any = {
            '@type': 'HowToStep',
            name: sanitizeString(step.name) || `Step ${i + 1}`,
            text: sanitizeString(step.text)
        };

        const imageUrl = sanitizeUrl(step.imageMedia?.url);
        if (imageUrl) {
            stepObj.image = imageUrl;
        }

        return stepObj;
    });

    return jsonLd;
}

/**
 * Add FAQ-specific fields
 */
export function addFaqFields(jsonLd: JsonLdSchema, overrides: JsonLdOverrides): JsonLdSchema {
    if (!overrides.faq?.questions?.length) {
        throw new Error('FAQ requires at least one question');
    }

    jsonLd.mainEntity = overrides.faq.questions.map((item: any, i: number) => {
        if (!item.question || !item.answer) {
            throw new Error(`FAQ item ${i + 1} requires both question and answer`);
        }

        return {
            '@type': 'Question',
            name: sanitizeString(item.question),
            acceptedAnswer: {
                '@type': 'Answer',
                text: sanitizeString(item.answer)
            }
        };
    });

    return jsonLd;
}

/**
 * Add Recipe-specific fields
 */
export function addRecipeFields(jsonLd: JsonLdSchema, overrides: JsonLdOverrides): JsonLdSchema {
    if (!overrides.recipe) return jsonLd;

    const recipe = overrides.recipe;

    if (recipe.prepTime) jsonLd.prepTime = sanitizeString(recipe.prepTime);
    if (recipe.cookTime) jsonLd.cookTime = sanitizeString(recipe.cookTime);
    if (recipe.recipeYield) jsonLd.recipeYield = sanitizeString(recipe.recipeYield);
    if (recipe.recipeCategory) jsonLd.recipeCategory = sanitizeString(recipe.recipeCategory);

    if (!recipe.recipeIngredient?.length) {
        throw new Error('Recipe requires at least one ingredient');
    }

    jsonLd.recipeIngredient = recipe.recipeIngredient.map((ing: string) => sanitizeString(ing));

    const imageUrl = sanitizeUrl(recipe.imageMedia?.url);
    if (imageUrl) {
        if (!jsonLd.image) {
            jsonLd.image = [imageUrl];
        } else if (Array.isArray(jsonLd.image)) {
            jsonLd.image.unshift(imageUrl);
        } else {
            jsonLd.image = [imageUrl, jsonLd.image];
        }
    }

    return jsonLd;
}

/**
 * Add type-specific fields based on schema type
 */
export function addTypeSpecificFields(
    jsonLd: JsonLdSchema,
    type: string,
    overrides: JsonLdOverrides
): JsonLdSchema {
    switch (type) {
        case 'Review':
            return addReviewFields(jsonLd, overrides);
        case 'HowTo':
            return addHowToFields(jsonLd, overrides);
        case 'FAQ':
            return addFaqFields(jsonLd, overrides);
        case 'Recipe':
            return addRecipeFields(jsonLd, overrides);
        default:
            return jsonLd;
    }
}

/**
 * Apply custom JSON overrides
 */
export function applyCustomJson(jsonLd: JsonLdSchema, overrides: JsonLdOverrides): JsonLdSchema {
    if (!overrides.customJson) return jsonLd;

    const custom = parseCustomJson(overrides.customJson);
    if (!custom) return jsonLd;

    return Object.assign(jsonLd, custom);
}