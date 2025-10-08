import {ServerPluginModule, ServerSDK} from '@supergrowthai/plugin-dev-kit/server';
import {generateBlogJsonLd} from '../utils/blog-json-ld.js';

const BLOG_OVERRIDES_PREFIX = 'jsonLd:blogOverrides:';

export const blogHooks: ServerPluginModule["hooks"] = {
    // Clear JSON-LD cache when blog is updated
    'blog:afterUpdate': async (sdk: ServerSDK, payload: any) => {
        sdk.log.debug('Blog updated, clearing JSON-LD cache:', payload.blogId);

        // Clear cached JSON-LD for this blog
        const cacheKey = `jsonLd:generated:${payload.blogId}`;
        await sdk.cache?.delete(cacheKey);
    },

    // Clear JSON-LD cache when blog is deleted
    'blog:afterDelete': async (sdk: ServerSDK, payload: any) => {
        sdk.log.debug('Blog deleted, cleaning up JSON-LD data:', payload.blogId);

        // Clear cache
        const cacheKey = `jsonLd:generated:${payload.blogId}`;
        await sdk.cache?.delete(cacheKey);

        // Clean up blog-specific overrides
        const overridesKey = `${BLOG_OVERRIDES_PREFIX}${payload.blogId}`;
        await (sdk.settings as any).delete(overridesKey);
    },

    // Inject JSON-LD into blog page head
    'blog:beforeRender': async (sdk: ServerSDK, payload: any) => {
        try {
            const blogId = payload.blogId || payload.blog?.id;
            if (!blogId) {
                sdk.log.warn('No blog ID provided for JSON-LD injection');
                return payload;
            }

            // Generate JSON-LD for this blog
            const jsonLd = await generateBlogJsonLd(sdk, blogId);

            if (jsonLd) {
                // Inject into head
                const jsonLdScript = `<script type="application/ld+json">${JSON.stringify(jsonLd, null, 0)}</script>`;

                // Add to existing head content or create new head section
                if (payload.head) {
                    payload.head += '\n' + jsonLdScript;
                } else {
                    payload.head = jsonLdScript;
                }

                sdk.log.info('JSON-LD injected into blog head:', blogId);
            }

            return payload;
        } catch (error) {
            sdk.log.error('Error injecting JSON-LD into blog head:', error);
            return payload;
        }
    }
};