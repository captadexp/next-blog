import {ServerSDK} from '@supergrowthai/plugin-dev-kit/server';
import type {MergeContext} from '../../types/plugin-types.js';
import {generateJsonLd} from '../../json-ld-merger.js';
import {transformBlogData} from './data-transform.js';

const GLOBAL_SETTINGS_KEY = 'jsonLd:globalSettings';
const BLOG_OVERRIDES_PREFIX = 'jsonLd:blogOverrides:';

export async function generateBlogJsonLd(sdk: ServerSDK, blogId: string, overridesOrRegenerate?: any): Promise<any> {
    const cacheKey = `jsonLd:generated:${blogId}`;
    const forceRegenerate = typeof overridesOrRegenerate === 'boolean' ? overridesOrRegenerate : false;

    if (!forceRegenerate && sdk.cache) {
        const cached = await sdk.cache.get(cacheKey);
        if (cached) {
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

    const globalSettings = await sdk.settings.get(GLOBAL_SETTINGS_KEY);
    const overridesKey = `${BLOG_OVERRIDES_PREFIX}${blogId}`;
    const overrides = typeof overridesOrRegenerate === 'object' ? overridesOrRegenerate : await sdk.settings.get(overridesKey);

    // Create merge context
    const context: MergeContext = {
        blogData: transformBlogData(blog),
        globalSettings: globalSettings || {},
        overrides: overrides || { '@type': 'Article', overrides: {}, custom: {} },
        baseUrl: sdk.config?.baseUrl || 'https://localhost:3000'
    };

    // Generate JSON-LD
    const jsonLd = generateJsonLd(context);

    if (sdk.cache) {
        await sdk.cache.set(cacheKey, jsonLd, 3600);
    }

    sdk.log.debug('Generated and cached JSON-LD for blog:', blogId);
    return jsonLd;
}