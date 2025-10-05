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
            callRPC: async (hookName, payload) => {
                console.debug(`[Plugin: ${pluginId}] Calling RPC: ${hookName}`);
                return this.deps.callHook(String(hookName), payload);
            },

            // Hook execution with plugin tracking
            callHook: async (hookName, payload) => {
                // fixme this calls rpc for now
                console.debug(`[Plugin: ${pluginId}] Calling hook: ${hookName}`);
                console.warn(`[Plugin: ${pluginId}] Calling RPC: ${hookName}`);
                console.warn(`[Plugin: ${pluginId}] use callRPC instead of callHook: ${hookName}`);
                return this.deps.callHook(String(hookName), payload);
            },

            startIntent: <T, R>(intentType: string, payload: T): Promise<R> => {
                console.debug(`[Plugin: ${pluginId}] Starting intent: ${intentType}`);

                return new Promise((resolve, reject) => {
                    const requestId = `${pluginId}-${intentType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

                    const handleResponse = (event: Event) => {
                        const customEvent = event as CustomEvent;
                        const response = customEvent.detail;
                        cleanup();

                        if (response.success) {
                            resolve(response.payload as R);
                        } else if (response.cancelled) {
                            resolve(null as R);
                        } else {
                            reject(new Error(response.error || 'Intent failed'));
                        }
                    };

                    const cleanup = () => {
                        window.removeEventListener(`intent:response:${requestId}`, handleResponse);
                        clearTimeout(timeoutId);
                    };

                    const timeoutId = setTimeout(() => {
                        cleanup();
                        reject(new Error('Intent timeout'));
                    }, 60 * 60 * 1000);

                    // Listen to request-specific response channel
                    window.addEventListener(`intent:response:${requestId}`, handleResponse);

                    // Dispatch intent request
                    window.dispatchEvent(new CustomEvent('intent:request', {
                        detail: {requestId, intentType, payload},
                        bubbles: true
                    }));
                });
            },

            get system(): never {
                throw new Error("not implemented yet")
            },
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