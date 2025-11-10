import type {Configuration, ServerHooks} from "@supergrowthai/next-blog-types/server";
import type {ServerSDK} from "@supergrowthai/next-blog-types";
import type {MinimumRequest, OneApiFunction, PathObject, SessionData} from "@supergrowthai/oneapi";
import type {ApiExtra} from "../types/api.js";
import pluginExecutor from "../plugins/plugin-executor.server.js";
import {ServerSettingsHelper} from "../plugins/settings-helper.server.js";
import {VERSION_INFO} from "../version.js";
import {getSystemPluginId} from "./defaultSettings.js";
import {StorageFactory} from "../storage/storage-factory.ts";
import {ServerCacheHelper} from "../plugins/cache-helper.server.ts";
import {ServerEventsHelper} from "../plugins/events-helper.server.ts";

export const createWithExtras = (configuration: Configuration) => {
    return (fn: OneApiFunction<ApiExtra>): OneApiFunction => {
        const wrappedFn = async (session: SessionData, request: MinimumRequest, extra: any) => {
            // Initialize SDK for internal use
            const db = await configuration.db();

            // Get system plugin information
            const systemPluginId = await getSystemPluginId(db);
            const systemPlugin = await db.plugins.findById(systemPluginId);
            if (!systemPlugin) {
                throw new Error('System plugin not found');
            }

            const sdk: ServerSDK = {
                log: console,
                db,
                system: {
                    version: VERSION_INFO.version,
                    buildTime: VERSION_INFO.buildTime,
                    buildMode: VERSION_INFO.buildMode
                },
                cache: new ServerCacheHelper("system"),
                events: new ServerEventsHelper("events"),
                storage: await StorageFactory.create("system", db),
                pluginId: systemPlugin.id,
                settings: new ServerSettingsHelper(systemPlugin, db, session.user?._id),
                callHook: async (hookName, payload) => {
                    return pluginExecutor.executeHook(String(hookName), sdk, payload);
                },
                callRPC: async (hookName, payload) => {
                    return pluginExecutor.executeRpc(String(hookName), sdk, payload);
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

        // Copy all properties from original function to wrapped function
        Object.assign(wrappedFn, fn);

        return wrappedFn;
    };
};

export const wrapPathObject = (configuration: Configuration, obj: PathObject): PathObject => {
    const withExtras = createWithExtras(configuration);
    const wrapped: PathObject = {};
    for (const key in obj) {
        const value = obj[key];
        if (typeof value === 'function') {
            wrapped[key] = withExtras(value);
        } else if (typeof value === 'object' && value !== null) {
            wrapped[key] = wrapPathObject(configuration, value);
        } else {
            wrapped[key] = value;
        }
    }
    return wrapped;
};