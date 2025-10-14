import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {ServerSDK} from '@supergrowthai/next-blog-types/server';

// Server-side hooks that run in Node.js
export default defineServer({
    hooks: {
        // Hook into blog creation process
        'blog:beforeCreate': async (sdk, payload) => {
            sdk.log.info('Blog being created:', payload.title);

            // Example: Add validation
            if (!payload.title || payload.title.length < 5) {
                throw new Error('Blog title must be at least 5 characters');
            }

            // Example: Add metadata
            return {
                ...payload,
                metadata: {
                    // @ts-ignore
                    ...payload.metadata,
                    createdVia: 'my-plugin'
                }
            };
        },

        // React to blog updates
        'blog:afterUpdate': async (sdk, payload) => {
            sdk.log.info('Blog updated:', payload.blogId);

            // Example: Store update history in settings
            const historyKey = `blog-history-${payload.blogId}`;
            const history = await sdk.settings.get(historyKey) || [];
            history.push({
                updatedAt: new Date().toISOString(),
                changes: payload.data
            });
            await sdk.settings.set(historyKey, history);
        },

        // Hook into user authentication
        'auth:afterLogin': async (sdk, payload) => {
            sdk.log.info('User logged in:', payload.userId);

            // Example: Track login count in settings
            const countKey = `login-count-${payload.userId}`;
            const count = await sdk.settings.get(countKey) || 0;
            await sdk.settings.set(countKey, count + 1);
        }
    },
    rpcs: {
        // RPC method callable via API
        'myPlugin:getData': async (sdk: ServerSDK, request: any) => {
            sdk.log.info('getData RPC called');

            // Example: Fetch some data
            const blogs = await sdk.db.blogs.find({
                status: 'published'
            });

            return {
                blogCount: blogs.length,
                timestamp: new Date().toISOString()
            };
        },

        'myPlugin:processContent': async (sdk: ServerSDK, request: { content: string }) => {
            sdk.log.debug('Processing content');

            // Example: Process content somehow
            const processed = request.content.toUpperCase();

            return {
                original: request.content,
                processed: processed,
                processedAt: new Date().toISOString()
            };
        }
    }
});
