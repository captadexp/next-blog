import {extractImagesFromContent} from '@supergrowthai/plugin-dev-kit/content';
import type {MergeContext} from '../types/plugin-types.js';

interface ExtractedImage {
    src: string;
    alt?: string;
    url?: string;
}

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
            const contentImages = extractImagesFromContent(blogData.content) as (string | ExtractedImage)[];
            if (contentImages.length > 0) {
                const firstImage = contentImages[0];
                if (typeof firstImage === 'string') {
                    return [firstImage];
                } else if (firstImage && typeof firstImage === 'object') {
                    const img = firstImage as ExtractedImage;
                    return [img.url || img.src || ''].filter(Boolean);
                }
            }
            return [];
        case 'none':
        default:
            return [];
    }
}