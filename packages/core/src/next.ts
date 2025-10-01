import {createNextJSRouter} from "@supergrowthai/oneapi/nextjs";
import type {Configuration, ServerSDK, ServerHooks} from "@supergrowthai/types/server";
import type {MinimumRequest, OneApiFunction, PathObject, SessionData} from "@supergrowthai/oneapi/types";
import type {ApiExtra} from "./types/api.js";
import {BasicAuthHandler} from "./auth/basic-auth-handler.js";
import cmsPaths from "./cmsPaths.js";
import {initializeDefaultSettings} from "./utils/defaultSettings.js";
import pluginExecutor from "./plugins/plugin-executor.server.js";
import {ServerSettingsHelper} from "./plugins/settings-helper.server.js";

/**
 * Main CMS function that creates the API route handlers
 */
const nextBlog = function (configuration: Configuration) {
    // Create auth handler
    const authHandler = new BasicAuthHandler(configuration.db);

    // Create wrapper function to enhance extra parameter
    const withExtras = (fn: OneApiFunction<ApiExtra>): OneApiFunction => {
        return async (session: SessionData, request: MinimumRequest, extra) => {
            // Initialize SDK for internal use
            const db = await configuration.db();
            const sdk = {
                log: console,
                db,
                executionContext: session.user,  // Pass the authenticated user as execution context
                config: {},
                pluginId: 'system',
                settings: new ServerSettingsHelper('system', db),
                callHook: async <K extends keyof ServerHooks>(
                    hookName: K,
                    payload: ServerHooks[K]['payload']
                ): Promise<ServerHooks[K]['response'] | undefined> => {
                    return pluginExecutor.executeHook(String(hookName), sdk, payload);
                }
            };

            // Enhanced extra with utilities
            const enhancedExtra: ApiExtra = {
                ...extra,
                db: configuration.db,  // Pass the db function directly
                callHook: async <K extends keyof ServerHooks>(
                    hookName: K,
                    payload: ServerHooks[K]['payload']
                ): Promise<ServerHooks[K]['response'] | undefined> => {
                    return pluginExecutor.executeHook(String(hookName), sdk, payload);
                },
                callbacks: configuration.callbacks,
                configuration, // Pass the full configuration
                sdk // For plugins.ts executeRpc
            };

            return fn(session, request, enhancedExtra);
        };
    };

    // Recursively wrap all handlers in the PathObject
    const wrapPathObject = (obj: PathObject): PathObject => {
        const wrapped: PathObject = {};
        for (const key in obj) {
            const value = obj[key];
            if (typeof value === 'function') {
                wrapped[key] = withExtras(value);
            } else if (typeof value === 'object' && value !== null) {
                wrapped[key] = wrapPathObject(value);
            } else {
                wrapped[key] = value;
            }
        }
        return wrapped;
    };

    const wrappedPaths = wrapPathObject(cmsPaths);

    // Create a single router for all methods
    const router = createNextJSRouter(wrappedPaths, {
        pathPrefix: "/api/next-blog/",
        authHandler,
        createApiImpl: async ({request}) => {
            // Initialize database and plugins
            const db = await configuration.db();
            await initializeDefaultSettings(db);
            await pluginExecutor.initialize(db);

            return {
                db: configuration.db,
                configuration
            };
        }
    });

    // Return all the handlers from the single router
    return router.handlers();
};

export default nextBlog;