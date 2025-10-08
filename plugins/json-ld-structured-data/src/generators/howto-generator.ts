import type {HowTo} from '../types/core-types.js';
import type {MergeContext} from '../types/plugin-types.js';
import {getFieldValue} from '../utils/field-utils.js';
import {getImages} from '../utils/image-utils.js';

/**
 * Generate HowTo schema
 */
export function generateHowToSchema(context: MergeContext): HowTo {
    const {blogData, overrides} = context;

    const howTo: HowTo = {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: getFieldValue('name', context) || blogData.title
    };

    const description = getFieldValue('description', context) || blogData.excerpt;
    if (description) {
        howTo.description = description;
    }

    // Author
    if (blogData.author) {
        howTo.author = {
            '@type': 'Person',
            name: blogData.author.username
        };
    }

    // Dates
    if (blogData.publishedAt || blogData.createdAt) {
        howTo.datePublished = blogData.publishedAt || blogData.createdAt;
    }

    if (blogData.updatedAt) {
        howTo.dateModified = blogData.updatedAt;
    }

    // Images
    const images = getImages(context);
    if (images.length > 0) {
        howTo.image = images.length === 1 ? images[0] : images;
    }

    // HowTo-specific fields using standard field override system
    const totalTime = getFieldValue('totalTime', context);
    if (totalTime) {
        howTo.totalTime = totalTime;
    }

    const prepTime = getFieldValue('prepTime', context);
    if (prepTime) {
        howTo.prepTime = prepTime;
    }

    const performTime = getFieldValue('performTime', context);
    if (performTime) {
        howTo.performTime = performTime;
    }

    const tool = getFieldValue('tool', context);
    if (tool && Array.isArray(tool) && tool.length > 0) {
        howTo.tool = tool;
    }

    const supply = getFieldValue('supply', context);
    if (supply && Array.isArray(supply) && supply.length > 0) {
        howTo.supply = supply;
    }

    const steps = getFieldValue('steps', context);
    if (steps && Array.isArray(steps) && steps.length > 0) {
        howTo.step = steps.map(step => ({
            '@type': 'HowToStep',
            ...(step.name && {name: step.name}),
            text: step.text,
            ...(step.image && {image: step.image})
        }));
    }

    const estimatedCost = getFieldValue('estimatedCost', context);
    if (estimatedCost) {
        howTo.estimatedCost = estimatedCost;
    }

    const yieldValue = getFieldValue('yield', context);
    if (yieldValue) {
        howTo.yield = yieldValue;
    }

    return howTo;
}