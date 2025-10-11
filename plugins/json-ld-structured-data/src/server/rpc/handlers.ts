import {ServerPluginModule, ServerSDK} from '@supergrowthai/plugin-dev-kit/server';
import type {BlogJsonLdOverrides, GlobalJsonLdSettings} from '../../types/plugin-types.js';
import {generateBlogJsonLd} from '../utils/blog-json-ld.js';
import {validateJsonLd} from '../../validation/validators.js';

const GLOBAL_SETTINGS_KEY = 'jsonLd:globalSettings';
const BLOG_OVERRIDES_PREFIX = 'jsonLd:blogOverrides:';

export const rpcHandlers: ServerPluginModule["rpcs"] = {
    'jsonLd:getGlobalSettings': async (sdk: ServerSDK, request: {}) => {
        const settings = await sdk.settings.get(GLOBAL_SETTINGS_KEY);
        return {code: 0, message: "Success", payload: {settings}};
    },

    'jsonLd:saveGlobalSettings': async (sdk: ServerSDK, request: { settings: GlobalJsonLdSettings }) => {
        await sdk.settings.set(GLOBAL_SETTINGS_KEY, request.settings);
        return {code: 0, message: "Settings saved successfully", payload: {success: true}};
    },

    'jsonLd:getBlogOverrides': async (sdk: ServerSDK, request: { blogId: string }) => {
        const overridesKey = `${BLOG_OVERRIDES_PREFIX}${request.blogId}`;
        const overrides = await sdk.settings.get(overridesKey);
        return {code: 0, message: "Success", payload: overrides};
    },

    'jsonLd:saveBlogOverrides': async (sdk: ServerSDK, request: {
        blogId: string;
        overrides: BlogJsonLdOverrides
    }) => {
        const overridesKey = `${BLOG_OVERRIDES_PREFIX}${request.blogId}`;
        await sdk.settings.set(overridesKey, request.overrides);

        const cacheKey = `jsonLd:generated:${request.blogId}`;
        await sdk.cache?.delete(cacheKey);
        return {code: 0, message: "Overrides saved successfully", payload: {success: true}};
    },

    'jsonLd:generatePreview': async (sdk: ServerSDK, request: {
        blogId: string;
        overrides: BlogJsonLdOverrides
    }) => {
        const jsonLd = await generateBlogJsonLd(sdk, request.blogId, request.overrides);
        const validation = validateJsonLd(jsonLd, request.overrides['@type'] || 'Article');
        return {code: 0, message: "Preview generated", payload: {jsonLd, validation}};
    },

    'jsonLd:validateAllBlogs': async (sdk: ServerSDK, request: {}) => {
        const blogs = await sdk.db.blogs.find({status: 'published'});
        const results = {
            valid: 0,
            invalid: 0,
            warnings: 0,
            issues: [] as Array<{ blogId: string; title: string; errors: any[]; warnings: any[] }>
        };

        for (const blog of blogs) {
            const jsonLd = await generateBlogJsonLd(sdk, blog._id);
            if (jsonLd) {
                const validation = validateJsonLd(jsonLd, 'Article');

                if (validation.valid) {
                    results.valid++;
                } else {
                    results.invalid++;
                }

                if (validation.warnings.length > 0) {
                    results.warnings++;
                }

                if (validation.errors.length > 0 || validation.warnings.length > 0) {
                    results.issues.push({
                        blogId: blog._id,
                        title: blog.title,
                        errors: validation.errors,
                        warnings: validation.warnings
                    });
                }
            }
        }

        return {code: 0, message: "Validation complete", payload: results};
    }
};