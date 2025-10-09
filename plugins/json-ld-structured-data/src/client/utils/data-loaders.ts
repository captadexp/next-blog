import {ClientSDK} from '@supergrowthai/plugin-dev-kit/client';
import {setBlogOverrides} from './plugin-state.js';

// Simple data loading functions - no unnecessary state tracking
export async function loadBlogData(sdk: ClientSDK, context: { blogId: string }) {
    if (!context?.blogId) {
        throw new Error('Blog ID is required');
    }

    try {
        const [blog, overridesResponse] = await Promise.all([
            sdk.apis.getBlog(context.blogId),
            sdk.callRPC('jsonLd:getBlogOverrides', {blogId: context.blogId})
        ]);

        const {overrides} = overridesResponse.payload.payload;

        if (overrides) {
            setBlogOverrides(context.blogId, overrides);
        } else {
            // Initialize with defaults
            setBlogOverrides(context.blogId, {
                '@type': 'Article',
                overrides: {},
                custom: {}
            });
        }
    } catch (error) {
        throw error;
    }

    sdk.refresh();
}

// Global settings are stored separately in their own module if needed
export async function loadGlobalSettings(sdk: ClientSDK) {
    try {
        const response = await sdk.callRPC('jsonLd:getGlobalSettings', {});
        return response.payload.payload.settings || {};
    } catch (error) {
        throw error;
    }
}