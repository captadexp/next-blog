import {ServerPluginModule, ServerSDK} from '@supergrowthai/plugin-dev-kit/server';
import type {BlogJsonLdOverrides, GlobalJsonLdSettings, MergeContext} from '../../types/plugin-types.js';
import {generateJsonLd} from '../../json-ld-merger.js';
import {validateJsonLd} from '../../validation/validators.js';
import {generateBlogJsonLd} from '../utils/blog-json-ld.js';
import {transformBlogData} from '../utils/data-transform.js';

const GLOBAL_SETTINGS_KEY = 'jsonLd:globalSettings';
const BLOG_OVERRIDES_PREFIX = 'jsonLd:blogOverrides:';

export const rpcHandlers: ServerPluginModule["rpcs"] = {
    // Get global settings
    'jsonLd:getGlobalSettings': async (sdk: ServerSDK, request: {}) => {
        sdk.log.debug('Getting global JSON-LD settings');

        try {
            const settings = await sdk.settings.get(GLOBAL_SETTINGS_KEY) || {};
            return {code: 0, message: "Success", payload: {settings}};
        } catch (error) {
            sdk.log.error('Error getting global settings:', error);
            return {code: -1, message: "Failed to get global settings", payload: {settings: {}}};
        }
    },

    // Save global settings
    'jsonLd:saveGlobalSettings': async (sdk: ServerSDK, request: { settings: GlobalJsonLdSettings }) => {
        sdk.log.debug('Saving global JSON-LD settings');

        try {
            await sdk.settings.set(GLOBAL_SETTINGS_KEY, request.settings);

            // Clear all JSON-LD caches since global settings affect all blogs
            const cacheKeys = await (sdk.cache as any)?.keys('jsonLd:generated:*') || [];
            for (const key of cacheKeys) {
                await sdk.cache?.delete(key);
            }

            sdk.log.info('Global JSON-LD settings saved and cache cleared');
            return {code: 0, message: "Settings saved successfully", payload: {success: true}};
        } catch (error) {
            sdk.log.error('Error saving global settings:', error);
            return {code: -1, message: "Failed to save global settings", payload: {success: false}};
        }
    },

    // Get blog-specific overrides
    'jsonLd:getBlogOverrides': async (sdk: ServerSDK, request: { blogId: string }) => {
        sdk.log.debug('Getting blog JSON-LD overrides:', request.blogId);

        try {
            const overridesKey = `${BLOG_OVERRIDES_PREFIX}${request.blogId}`;
            const overrides = await sdk.settings.get(overridesKey);
            return {code: 0, message: "Success", payload: {overrides}};
        } catch (error) {
            sdk.log.error('Error getting blog overrides:', error);
            return {code: -1, message: "Failed to get blog overrides", payload: {overrides: null}};
        }
    },

    // Save blog-specific overrides
    'jsonLd:saveBlogOverrides': async (sdk: ServerSDK, request: {
        blogId: string;
        overrides: BlogJsonLdOverrides
    }) => {
        sdk.log.debug('Saving blog JSON-LD overrides:', request.blogId);

        try {
            const overridesKey = `${BLOG_OVERRIDES_PREFIX}${request.blogId}`;
            await sdk.settings.set(overridesKey, request.overrides);

            // Clear cache for this specific blog
            const cacheKey = `jsonLd:generated:${request.blogId}`;
            await sdk.cache?.delete(cacheKey);

            sdk.log.info('Blog JSON-LD overrides saved:', request.blogId);
            return {code: 0, message: "Overrides saved successfully", payload: {success: true}};
        } catch (error) {
            sdk.log.error('Error saving blog overrides:', error);
            return {code: -1, message: "Failed to save blog overrides", payload: {success: false}};
        }
    },

    // Generate JSON-LD preview
    'jsonLd:generatePreview': async (sdk: ServerSDK, request: {
        blogId: string;
        overrides: BlogJsonLdOverrides
    }) => {
        sdk.log.debug('Generating JSON-LD preview:', request.blogId);

        try {
            // Get blog data
            const blog = await sdk.db.blogs.findById(request.blogId);
            if (!blog) {
                throw new Error('Blog not found');
            }

            // Get global settings
            const globalSettings = await sdk.settings.get(GLOBAL_SETTINGS_KEY) || {};

            // Create merge context
            const context: MergeContext = {
                blogData: transformBlogData(blog),
                globalSettings,
                overrides: request.overrides,
                baseUrl: sdk.config?.baseUrl || 'https://example.com'
            };

            // Generate JSON-LD
            const jsonLd = generateJsonLd(context);

            // Validate
            const validation = validateJsonLd(jsonLd, request.overrides['@type'] || 'Article');

            return {
                code: 0,
                message: "Success",
                payload: {
                    jsonLd,
                    validation
                }
            };
        } catch (error: any) {
            sdk.log.error('Error generating JSON-LD preview:', error);
            return {
                code: -1,
                message: "Failed to generate preview",
                payload: {
                    jsonLd: null,
                    validation: {
                        valid: false,
                        errors: [{field: 'general', message: error?.message || 'Unknown error'}],
                        warnings: []
                    }
                }
            };
        }
    },

    // Get generated JSON-LD for a blog (for debugging/inspection)
    'jsonLd:getBlogJsonLd': async (sdk: ServerSDK, request: { blogId: string }) => {
        sdk.log.debug('Getting generated JSON-LD for blog:', request.blogId);

        try {
            const jsonLd = await generateBlogJsonLd(sdk, request.blogId);
            return {code: 0, message: "Success", payload: {jsonLd}};
        } catch (error) {
            sdk.log.error('Error getting blog JSON-LD:', error);
            return {code: -1, message: "Failed to get blog JSON-LD", payload: {jsonLd: null}};
        }
    },

    // Bulk regenerate JSON-LD cache (for maintenance)
    'jsonLd:regenerateCache': async (sdk: ServerSDK, request: { blogIds?: string[] }) => {
        sdk.log.info('Regenerating JSON-LD cache');

        try {
            let blogIds = request.blogIds;

            if (!blogIds) {
                // Get all published blogs
                const blogs = await sdk.db.blogs.find({status: 'published'});
                blogIds = blogs.map((blog: any) => blog.id);
            }

            const results = {
                success: 0,
                failed: 0,
                errors: [] as string[]
            };

            for (const blogId of blogIds) {
                try {
                    await generateBlogJsonLd(sdk, blogId, true); // Force regeneration
                    results.success++;
                } catch (error: any) {
                    results.failed++;
                    results.errors.push(`${blogId}: ${error?.message || 'Unknown error'}`);
                    sdk.log.error('Error regenerating JSON-LD for blog:', blogId, error);
                }
            }

            sdk.log.info('JSON-LD cache regeneration complete:', results);
            return {code: 0, message: "Cache regeneration complete", payload: results};
        } catch (error: any) {
            sdk.log.error('Error in bulk JSON-LD regeneration:', error);
            return {
                code: -1,
                message: "Failed to regenerate cache",
                payload: {success: 0, failed: 0, errors: [error?.message || 'Unknown error']}
            };
        }
    },

    // Validate all blogs' JSON-LD
    'jsonLd:validateAll': async (sdk: ServerSDK, request: {}) => {
        sdk.log.info('Validating all blogs JSON-LD');

        try {
            const blogs = await sdk.db.blogs.find({status: 'published'});
            const results = {
                valid: 0,
                invalid: 0,
                warnings: 0,
                issues: [] as Array<{ blogId: string; title: string; errors: any[]; warnings: any[] }>
            };

            for (const blog of blogs) {
                try {
                    const jsonLd = await generateBlogJsonLd(sdk, (blog as any).id);
                    if (jsonLd) {
                        const validation = validateJsonLd(jsonLd, 'Article'); // Default type for validation

                        if (validation.valid) {
                            results.valid++;
                        } else {
                            results.invalid++;
                        }

                        if (validation.warnings.length > 0) {
                            results.warnings++;
                        }

                        if (!validation.valid || validation.warnings.length > 0) {
                            results.issues.push({
                                blogId: (blog as any).id,
                                title: (blog as any).title,
                                errors: validation.errors,
                                warnings: validation.warnings
                            });
                        }
                    }
                } catch (error: any) {
                    results.invalid++;
                    results.issues.push({
                        blogId: (blog as any).id,
                        title: (blog as any).title,
                        errors: [{field: 'general', message: error?.message || 'Unknown error'}],
                        warnings: []
                    });
                }
            }

            sdk.log.info('JSON-LD validation complete:', {
                total: blogs.length,
                valid: results.valid,
                invalid: results.invalid,
                warnings: results.warnings
            });

            return {code: 0, message: "Validation complete", payload: results};
        } catch (error: any) {
            sdk.log.error('Error in JSON-LD validation:', error);
            return {
                code: -1,
                message: "Failed to validate JSON-LD",
                payload: {valid: 0, invalid: 0, warnings: 0, issues: []}
            };
        }
    }
};