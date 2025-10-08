import type {Review} from '../types/core-types.js';
import type {MergeContext} from '../types/plugin-types.js';
import {getFieldValue} from '../utils/field-utils.js';

/**
 * Generate Review schema
 */
export function generateReviewSchema(context: MergeContext): Review {
    const {blogData, overrides} = context;

    const review: Review = {
        '@context': 'https://schema.org',
        '@type': 'Review',
        itemReviewed: {
            '@type': (overrides.custom?.itemType as any) || 'Thing',
            name: overrides.custom?.itemName || 'Unknown Item'
        }
    };

    const name = getFieldValue('name', context) || blogData.title;
    if (name) {
        review.name = name;
    }

    // Author
    if (blogData.author) {
        review.author = {
            '@type': 'Person',
            name: blogData.author.username
        };
    }

    // Published date
    if (blogData.publishedAt || blogData.createdAt) {
        review.datePublished = blogData.publishedAt || blogData.createdAt;
    }

    // Review body
    const reviewBody = getFieldValue('description', context) || blogData.excerpt;
    if (reviewBody) {
        review.reviewBody = reviewBody;
    }

    // Rating
    if (overrides.custom?.ratingValue) {
        review.reviewRating = {
            '@type': 'Rating',
            ratingValue: overrides.custom.ratingValue,
            bestRating: overrides.custom?.bestRating || 5,
            worstRating: overrides.custom?.worstRating || 1
        };
    }

    return review;
}