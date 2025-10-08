import {ServerSDK} from '@supergrowthai/plugin-dev-kit/server';
import type {MergeContext} from '../../types/plugin-types.js';
import {generateJsonLd} from '../../json-ld-merger.js';
import {transformBlogData} from './data-transform.js';

const GLOBAL_SETTINGS_KEY = 'jsonLd:globalSettings';
const BLOG_OVERRIDES_PREFIX = 'jsonLd:blogOverrides:';

export async function generateBlogJsonLd(sdk: ServerSDK, blogId: string, forceRegenerate = false): Promise<any> {
    const cacheKey = `jsonLd:generated:${blogId}`;

    // Check cache first (unless forcing regeneration)
    if (!forceRegenerate) {
        const cached = await sdk.cache?.get(cacheKey);
        if (cached) {
            sdk.log.debug('Returning cached JSON-LD for blog:', blogId);
            return cached;
        }
    }

    // Get blog data
    const blog = await sdk.db.blogs.findById(blogId);
    if (!blog) {
        throw new Error('Blog not found');
    }

    // Only generate for published blogs
    if (blog.status !== 'published') {
        sdk.log.debug('Skipping JSON-LD generation for unpublished blog:', blogId);
        return null;
    }

    // Get global settings
    const globalSettings = await sdk.settings.get(GLOBAL_SETTINGS_KEY) || {};

    // Get blog-specific overrides
    const overridesKey = `${BLOG_OVERRIDES_PREFIX}${blogId}`;
    const overrides = await sdk.settings.get(overridesKey) || {
        '@type': 'Article',
        overrides: {},
        custom: {}
    };

    // Create merge context
    const context: MergeContext = {
        blogData: transformBlogData(blog),
        globalSettings,
        overrides,
        baseUrl: sdk.config?.baseUrl || 'https://example.com'
    };

    // Generate JSON-LD
    const jsonLd = generateJsonLd(context);

    // Cache the result (TTL: 1 hour)
    await sdk.cache?.set(cacheKey, jsonLd, 3600);

    sdk.log.debug('Generated and cached JSON-LD for blog:', blogId);
    return jsonLd;
}