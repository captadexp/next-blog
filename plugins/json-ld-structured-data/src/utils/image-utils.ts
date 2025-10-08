import {extractImagesFromContent} from '@supergrowthai/plugin-dev-kit/content';
import type {MergeContext} from '../types/plugin-types.js';

/**
 * Get images based on policy and overrides
 */
export function getImages(context: MergeContext): string[] {
    const {blogData, globalSettings, overrides} = context;

    // Check for custom images override
    if (overrides.overrides?.image && overrides.custom?.image?.length) {
        return overrides.custom.image.filter(img => img.trim());
    }

    // Use default image policy
    const policy = globalSettings.article?.defaultImagePolicy || 'featured';

    switch (policy) {
        case 'featured':
            return blogData.featuredImage ? [blogData.featuredImage] : [];
        case 'first':
            const contentImages = extractImagesFromContent(blogData.content);
            return contentImages.length > 0 ? [(contentImages[0] as any).url || contentImages[0].src || String(contentImages[0])] : [];
        case 'none':
        default:
            return [];
    }
}