import type {Recipe} from '../types/core-types.js';
import type {MergeContext} from '../types/plugin-types.js';
import {getFieldValue, generateAuthorField} from '../utils/field-utils.js';
import {getImages} from '../utils/image-utils.js';

/**
 * Generate Recipe schema
 */
export function generateRecipeSchema(context: MergeContext): Recipe {
    const {blogData} = context;

    const recipe: Recipe = {
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        name: getFieldValue('name', context) || blogData.title
    };

    // Description
    const description = getFieldValue('description', context) || blogData.excerpt;
    if (description) {
        recipe.description = description;
    }

    // Author
    const author = generateAuthorField(context);
    if (author) {
        recipe.author = author;
    }

    // Dates
    if (blogData.publishedAt || blogData.createdAt) {
        recipe.datePublished = getFieldValue('datePublished', context) || blogData.publishedAt || blogData.createdAt;
    }

    if (blogData.updatedAt) {
        recipe.dateModified = getFieldValue('dateModified', context) || blogData.updatedAt;
    }

    // Images
    const images = getImages(context);
    if (images.length > 0) {
        recipe.image = images.length === 1 ? images[0] : images;
    }

    // Recipe-specific fields
    const recipeCategory = getFieldValue('recipeCategory', context);
    if (recipeCategory) {
        recipe.recipeCategory = recipeCategory;
    }

    const recipeCuisine = getFieldValue('recipeCuisine', context);
    if (recipeCuisine) {
        recipe.recipeCuisine = recipeCuisine;
    }

    const prepTime = getFieldValue('prepTime', context);
    if (prepTime) {
        recipe.prepTime = prepTime;
    }

    const cookTime = getFieldValue('cookTime', context);
    if (cookTime) {
        recipe.cookTime = cookTime;
    }

    const totalTime = getFieldValue('totalTime', context);
    if (totalTime) {
        recipe.totalTime = totalTime;
    }

    const recipeYield = getFieldValue('recipeYield', context);
    if (recipeYield) {
        recipe.recipeYield = recipeYield;
    }

    const calories = getFieldValue('calories', context);
    if (calories) {
        recipe.nutrition = {
            '@type': 'NutritionInformation',
            calories: calories
        };
    }

    // Recipe ingredients
    const recipeIngredient = getFieldValue('recipeIngredient', context);
    if (recipeIngredient?.length) {
        recipe.recipeIngredient = recipeIngredient;
    }

    // Recipe instructions
    const recipeInstructions = getFieldValue('recipeInstructions', context);
    if (recipeInstructions?.length) {
        recipe.recipeInstructions = recipeInstructions.map((instruction: string) => ({
            '@type': 'CreativeWork',
            text: instruction
        }));
    }

    return recipe;
}