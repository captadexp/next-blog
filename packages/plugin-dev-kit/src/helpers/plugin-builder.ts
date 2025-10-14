import type {ClientPluginModule, ClientSDK, PluginManifest, ServerPluginModule, ServerSDK} from '@supergrowthai/next-blog-types';

// Import build-time placeholder types
/// <reference path="./build-env.d.ts" />

/**
 * Define a plugin manifest with type safety
 * Automatically injects URLs when running in dev mode
 *
 * @example
 * export default definePlugin({
 *   id: 'my-plugin',
 *   name: 'My Plugin',
 *   version: '1.0.0',
 *   description: 'A great plugin'
 * });
 */
export function definePlugin(manifest: PluginManifest): PluginManifest {
    // These placeholders are replaced at build time by Vite
    // @ts-ignore - These are defined at build time
    const baseUrl = typeof __PLUGIN_BASE_URL__ !== 'undefined' ? __PLUGIN_BASE_URL__ : null;
    // @ts-ignore
    const hasClient = typeof __HAS_CLIENT__ !== 'undefined' ? __HAS_CLIENT__ : false;
    // @ts-ignore
    const hasServer = typeof __HAS_SERVER__ !== 'undefined' ? __HAS_SERVER__ : false;
    // @ts-ignore
    const isDevMode = typeof __DEV_MODE__ !== 'undefined' ? __DEV_MODE__ : false;

    let result: PluginManifest = manifest;

    if (baseUrl) {
        result = {...result, url: manifest.url || `${baseUrl}/plugin.js`};

        if (hasClient && !manifest.client) {
            result.client = {type: 'url', url: `${baseUrl}/client.js`};
        }

        if (hasServer && !manifest.server) {
            result.server = {type: 'url', url: `${baseUrl}/server.js`};
        }
    }

    if (isDevMode && !manifest.devMode) {
        result = {
            ...result,
            devMode: true
        };
    }

    return result;
}

/**
 * Define client-side hooks with type safety
 * Simply returns the hooks object for direct export
 *
 * @example
 * import { defineClient } from '@supergrowthai/plugin-dev-kit';
 *
 * export default defineClient({
 *   'dashboard-home:before': (sdk) => <MyWidget />,
 *   'blogs-list:after': (sdk, _, context) => <BlogsWidget data={context.data} />
 * });
 */
export function defineClient(plugin: ClientPluginModule): ClientPluginModule {
    return plugin;
}

/**
 * Define server-side hooks with type safety
 * Returns the hooks object directly as expected by the system
 *
 * @example
 * import { defineServer, HOOKS } from '@supergrowthai/plugin-dev-kit';
 *
 * export default defineServer({
 *   [HOOKS.EVENTS.BLOG_BEFORE_SAVE]: async (sdk, payload) => {
 *     // Validate or modify data
 *     return payload;
 *   }
 * });
 */
export function defineServer(plugin: ServerPluginModule): ServerPluginModule {
    return plugin;
}

/**
 * Helper to create a plugin component with proper types
 * This is syntactic sugar for creating UI components
 *
 * @example
 * const MyWidget = createComponent((sdk, context) => {
 *   const [state, setState] = useState(0);
 *   return <div>Widget</div>;
 * });
 */
export function createComponent<T extends Record<string, any> = {}>(
    component: (sdk: ClientSDK, context?: T) => JSX.Node | null
): (sdk: ClientSDK, prev?: any, context?: T) => JSX.Node | null {
    return (sdk, _prev, context) => component(sdk, context);
}

/**
 * Helper to create an async server hook with proper error handling
 *
 * @example
 * const validateBlog = createAsyncHook(async (sdk, payload) => {
 *   if (!payload.title) throw new Error('Title required');
 *   return payload;
 * });
 */
export function createAsyncHook<T = any, R = any>(
    handler: (sdk: ServerSDK, payload: T) => Promise<R>
): (sdk: ServerSDK, payload: T) => Promise<R> {
    return async (sdk, payload) => {
        try {
            return await handler(sdk, payload);
        } catch (error) {
            sdk.log.error('Hook error:', error);
            throw error;
        }
    };
}
