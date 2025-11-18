import type {APIClient, ClientSDK, NotificationStatus, Plugin, User} from '@supergrowthai/next-blog-types/client';
import {ClientSettingsHelper} from './settings-helper.client';
import {ClientCacheHelper} from './cache-helper.client';
import {ClientEventsHelper} from './events-helper.client';
import toast from 'react-hot-toast';
import {Logger, LogLevel} from "@supergrowthai/utils/client";
import ApiClientImpl from '../api/client';

/**
 * Dependencies required to create a client SDK instance
 */
interface ClientSDKDependencies {
    apis: APIClient;
    user: User | null;
    log: Logger;
    utils?: any;
}

/**
 * Factory to create plugin-specific SDK instances with all dependencies injected
 * This ensures complete isolation and fingerprinting for each plugin
 */
class ClientSDKFactory {
    constructor(private readonly deps: ClientSDKDependencies) {
    }

    /**
     * Create an SDK instance for a specific plugin
     * All operations performed through this SDK will be automatically scoped to the plugin
     */
    createSDK(plugin: Plugin, onRefresh?: () => void): ClientSDK {
        // Create plugin-specific helpers
        const settingsHelper = new ClientSettingsHelper(plugin);
        const cacheHelper = new ClientCacheHelper(plugin.id);
        const eventsHelper = new ClientEventsHelper(plugin.id);

        // Create the SDK with plugin fingerprinting
        const sdk: ClientSDK = {
            // Plugin identity - baked into every operation
            pluginId: plugin.id,

            log: this.createScopedLogger(plugin.id),

            // Settings with automatic plugin scoping
            settings: settingsHelper,

            // Cache with automatic plugin scoping
            cache: cacheHelper,

            // Events with automatic plugin scoping
            events: eventsHelper,

            // API client with automatic plugin headers
            apis: this.deps.apis,

            // User info
            user: this.deps.user,

            // Utility functions
            utils: this.deps.utils,

            // UI interaction methods with plugin context
            notify: (message: string, status?: NotificationStatus) => {
                console.log(`[Plugin: ${plugin.id}]`, message);

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
                console.debug(`[Plugin: ${plugin.id}] Refresh requested`);
                if (onRefresh) {
                    onRefresh();
                }
            },

            // Hook execution with plugin tracking
            callRPC: async (hookName, payload) => {
                console.debug(`[Plugin: ${plugin.id}] Calling RPC: ${hookName}`);
                return this.deps.apis.callPluginRPC(String(hookName), payload);
            },

            // Hook execution with plugin tracking
            callHook: async (hookName, payload) => {
                console.debug(`[Plugin: ${plugin.id}] Calling hook: ${hookName}`);
                return this.deps.apis.callPluginHook(String(hookName), payload);
            },

            startIntent: <T, R>(intentType: string, payload: T): Promise<R> => {
                console.debug(`[Plugin: ${plugin.id}] Starting intent: ${intentType}`);

                return new Promise((resolve, reject) => {
                    const requestId = `${plugin.id}-${intentType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

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
     * Create a logger that automatically includes plugin context
     */
    private createScopedLogger(pluginId: string) {
        const originalLogger = this.deps.log;
        const prefix = `[Plugin: ${pluginId}]`;

        return {
            debug: (...args: any[]) => originalLogger.debug(prefix, ...args),
            info: (...args: any[]) => originalLogger.info(prefix, ...args),
            warn: (...args: any[]) => originalLogger.warn(prefix, ...args),
            error: (...args: any[]) => originalLogger.error(prefix, ...args),
            time: (label: string) => originalLogger.time?.(`${prefix} ${label}`),
            timeEnd: (label: string) => originalLogger.timeEnd?.(`${prefix} ${label}`)
        };
    }
}

/**
 * Create a plugin-specific SDK with automatic header injection
 */
export function createClientSDK(
    plugin: Plugin,
    apis: APIClient,
    user: User | null,
    utils: any,
    onRefresh?: () => void
): ClientSDK {

    const pluginApiClient = new ApiClientImpl("/api/next-blog/api", {
        'X-Plugin-Id': plugin._id,
        'X-Plugin-Manifest-Id': plugin.id,
        'X-Plugin-Context': 'client'
    });

    const logger = new Logger('PluginExecutor', LogLevel.ERROR);
    const factory = new ClientSDKFactory({
        apis: pluginApiClient,
        log: logger,
        user,
        utils,
    });
    return factory.createSDK(plugin, onRefresh);
}