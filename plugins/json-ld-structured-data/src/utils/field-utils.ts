import type {MergeContext} from '../types/plugin-types.js';
import type {Person, Organization} from '../types/core-types.js';

/**
 * Get field value with override precedence
 */
export function getFieldValue(field: string, context: MergeContext): any {
    const {overrides} = context;

    // Check if field is overridden
    if (overrides.overrides?.[field] && overrides.custom?.[field] !== undefined) {
        return overrides.custom[field];
    }

    // Return undefined to use auto-derived values
    return undefined;
}

/**
 * Generate author field for schema objects
 */
export function generateAuthorField(context: MergeContext): Person | Organization | (Person | Organization)[] | undefined {
    const {blogData, overrides} = context;

    const authorOverride = overrides.custom?.author;
    if (overrides.overrides?.author && authorOverride?.length) {
        if (authorOverride.length === 1) {
            const auth = authorOverride[0];
            if (auth.type === 'organization') {
                return {
                    '@context': 'https://schema.org',
                    '@type': 'Organization' as const,
                    name: auth.name || '',
                    url: auth.url || '',
                    ...(auth.image && {image: auth.image})
                } as Organization;
            } else {
                return {
                    '@context': 'https://schema.org',
                    '@type': 'Person' as const,
                    name: auth.name || '',
                    ...(auth.url && {url: auth.url}),
                    ...(auth.image && {image: auth.image})
                } as Person;
            }
        } else {
            const organizations = authorOverride.filter(auth => auth.type === 'organization').map(auth => ({
                '@context': 'https://schema.org',
                '@type': 'Organization' as const,
                name: auth.name || '',
                url: auth.url || '',
                ...(auth.image && {image: auth.image})
            }));

            const persons = authorOverride.filter(auth => auth.type !== 'organization').map(auth => ({
                '@context': 'https://schema.org',
                '@type': 'Person' as const,
                name: auth.name || '',
                ...(auth.url && {url: auth.url}),
                ...(auth.image && {image: auth.image})
            }));

            // Return array of mixed types
            return [...organizations, ...persons] as (Person | Organization)[];
        }
    } else if (blogData.author) {
        return {
            '@context': 'https://schema.org',
            '@type': 'Person' as const,
            name: blogData.author.username,
            ...(blogData.author.profile?.website && {url: blogData.author.profile.website})
        } as Person;
    }

    return undefined;
}