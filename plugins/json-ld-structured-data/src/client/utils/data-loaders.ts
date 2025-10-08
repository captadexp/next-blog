import {ClientSDK, PluginRuntime} from '@supergrowthai/plugin-dev-kit/client';
import {setBlogOverrides, updatePluginState} from './plugin-state.js';

const {utils} = (window as any).PluginRuntime as PluginRuntime

export const loadBlogData = utils.debounce(async (sdk: ClientSDK, context: { blogId: string }) => {
    if (!context?.blogId) return;

    updatePluginState({isLoadingBlogData: true});
    sdk.refresh();

    try {
        // Throttled blog API call
        const throttledGetBlog = sdk.utils!.throttle(async (blogId: string) => {
            return await sdk.apis.getBlog(blogId);
        }, 800);

        // Debounced overrides call
        const debouncedGetOverrides = sdk.utils!.debounce(async (blogId: string) => {
            return await sdk.callRPC('jsonLd:getBlogOverrides', {
                blogId
            });
        }, 1200);

        // Load blog data and overrides
        const [blog, overridesResponse] = await Promise.all([
            throttledGetBlog(context.blogId),
            debouncedGetOverrides(context.blogId)
        ]);

        updatePluginState({currentBlogData: blog.payload});
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
        console.error('Failed to load blog data:', error);
        setBlogOverrides(context.blogId, {
            '@type': 'Article',
            overrides: {},
            custom: {}
        });
    }

    updatePluginState({isLoadingBlogData: false});
    sdk.refresh();
}, 1500)

export const loadGlobalSettings = utils.throttle(async (sdk: ClientSDK,) => {
    updatePluginState({isLoadingSettings: true});
    sdk.refresh();

    try {
        const response = await sdk.callRPC('jsonLd:getGlobalSettings', {});
        updatePluginState({
            globalSettings: response.payload.payload.settings || {},
            isLoadingSettings: false
        });
    } catch (error) {
        console.error('Failed to load global settings:', error);
        updatePluginState({
            globalSettings: {},
            isLoadingSettings: false
        });
    }

    sdk.refresh();
}, 1000)