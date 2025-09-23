import type {APIClient, ClientSDK, NotificationStatus, User} from '@supergrowthai/types/client';
import {ClientSettingsHelper} from './settings-helper.client';
import {ClientCacheHelper} from './cache-helper.client';
import {ClientEventsHelper} from './events-helper.client';
import toast from 'react-hot-toast';

/**
 * Dependencies required to create a client SDK instance
 */
export interface ClientSDKDependencies {
    apis: APIClient;
    user: User | null;
    utils?: any;
    callHook: (hookName: string, payload: any) => Promise<any>;
}

/**
 * Factory to create plugin-specific SDK instances with all dependencies injected
 * This ensures complete isolation and fingerprinting for each plugin
 */
export class ClientSDKFactory {
    constructor(private readonly deps: ClientSDKDependencies) {
    }

    /**
     * Create an SDK instance for a specific plugin
     * All operations performed through this SDK will be automatically scoped to the plugin
     */
    createSDK(pluginId: string, onRefresh?: () => void): ClientSDK {
        // Create plugin-specific helpers
        const settingsHelper = new ClientSettingsHelper(pluginId);
        const cacheHelper = new ClientCacheHelper(pluginId);
        const eventsHelper = new ClientEventsHelper(pluginId);

        // Wrap API client to add plugin headers
        const wrappedApis = this.createWrappedAPIClient(pluginId);

        // Create the SDK with plugin fingerprinting
        const sdk: ClientSDK = {
            // Plugin identity - baked into every operation
            pluginId,

            // Execution context
            executionContext: this.deps.user,

            // Settings with automatic plugin scoping
            settings: settingsHelper,

            // Cache with automatic plugin scoping
            cache: cacheHelper,

            // Events with automatic plugin scoping
            events: eventsHelper,

            // API client with automatic plugin headers
            apis: wrappedApis,

            // User info
            user: this.deps.user,

            // Utility functions
            utils: this.deps.utils,

            // UI interaction methods with plugin context
            notify: (message: string, status?: NotificationStatus) => {
                console.log(`[Plugin: ${pluginId}]`, message);

                if (status === 'info') {
                    toast(message);
                } else if (status === 'success') {
                    toast.success(message);
                } else if (status === 'error') {
                    toast.error(message);
                } else if (status === 'warning') {
                    toast(message, {icon: '⚠️'});
                } else {
                    toast(message);
                }
            },

            // Refresh method
            refresh: () => {
                console.debug(`[Plugin: ${pluginId}] Refresh requested`);
                if (onRefresh) {
                    onRefresh();
                }
            },

            // Hook execution with plugin tracking
            callHook: async (hookName: string, payload: any) => {
                console.debug(`[Plugin: ${pluginId}] Calling hook: ${hookName}`);
                return this.deps.callHook(hookName, payload);
            }
        };

        return sdk;
    }

    /**
     * Create a wrapped API client that adds plugin headers to all requests
     */
    private createWrappedAPIClient(pluginId: string): APIClient {
        const originalApis = this.deps.apis;

        // Create proxy that intercepts all method calls
        return new Proxy(originalApis, {
            get(target: any, prop: string) {
                const original = target[prop];

                // If it's not a function, return as is
                if (typeof original !== 'function') {
                    return original;
                }

                // Wrap the function to add plugin headers
                return async (...args: any[]) => {
                    // Log API call for debugging
                    console.debug(`[Plugin: ${pluginId}] API call: ${prop}`, args);

                    // If this is a raw fetch call, add headers
                    if (prop === 'fetch' || prop === 'request') {
                        const options = args[1] || {};
                        args[1] = {
                            ...options,
                            headers: {
                                ...options.headers,
                                'X-Plugin-Id': pluginId,
                                // Could add more metadata
                                'X-Plugin-Context': 'client'
                            }
                        };
                    }

                    // Call the original method
                    const result = await original.apply(target, args);

                    // Could track metrics here
                    console.debug(`[Plugin: ${pluginId}] API response for ${prop}:`, result);

                    return result;
                };
            }
        }) as APIClient;
    }
}

/**
 * Create a simple SDK without factory (for backwards compatibility)
 */
export function createClientSDK(
    pluginId: string,
    apis: APIClient,
    user: User | null,
    utils: any,
    callHook: (hookName: string, payload: any) => Promise<any>,
    onRefresh?: () => void
): ClientSDK {
    const factory = new ClientSDKFactory({apis, user, utils, callHook});
    return factory.createSDK(pluginId, onRefresh);
}