import type {Configuration, ServerHooks} from "@supergrowthai/types/server";
import type {ServerSDK} from "@supergrowthai/types";
import type {MinimumRequest, OneApiFunction, PathObject, SessionData} from "@supergrowthai/oneapi/types";
import type {ApiExtra} from "../types/api.js";
import pluginExecutor from "../plugins/plugin-executor.server.js";
import {ServerSettingsHelper} from "../plugins/settings-helper.server.js";
import {VERSION_INFO} from "../version.js";

export const createWithExtras = (configuration: Configuration) => {
    return (fn: OneApiFunction<ApiExtra>): OneApiFunction => {
        return async (session: SessionData, request: MinimumRequest, extra) => {
            // Initialize SDK for internal use
            const db = await configuration.db();
            const sdk: ServerSDK = {
                log: console,
                db,
                executionContext: session.user,  // Pass the authenticated user as execution context
                config: {},
                system: {
                    version: VERSION_INFO.version,
                    buildTime: VERSION_INFO.buildTime,
                    buildMode: VERSION_INFO.buildMode
                },
                pluginId: 'system',
                settings: new ServerSettingsHelper('system', db, session.user?._id),
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