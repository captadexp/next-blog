import type {DatabaseAdapter, Logger, ServerConfig, ServerSDK, User} from '@supergrowthai/types/server';
import {ServerSettingsHelper} from './settings-helper.server.js';
import {ServerCacheHelper} from './cache-helper.server.js';
import {ServerEventsHelper} from './events-helper.server.js';
import {ServerStorageHelper} from './storage-helper.server.js';

/**
 * Dependencies required to create a server SDK instance
 */
export interface ServerSDKDependencies {
    db: DatabaseAdapter;
    log: Logger;
    config: ServerConfig;
    executionContext: User | null;
    pluginExecutor: {
        executeHook: (hookName: string, sdk: ServerSDK, context: any) => Promise<any>;
        executeRpc: (rpcName: string, sdk: ServerSDK, context: any) => Promise<any>;
    };
}

/**
 * Factory to create plugin-specific SDK instances with all dependencies injected
 * This ensures complete isolation and fingerprinting for each plugin
 */
export class ServerSDKFactory {
    constructor(private readonly deps: ServerSDKDependencies) {
    }

    /**
     * Create an SDK instance for a specific plugin
     * All operations performed through this SDK will be automatically scoped to the plugin
     */
    createSDK(pluginId: string): ServerSDK {
        // Create plugin-specific helpers
        const settingsHelper = new ServerSettingsHelper(pluginId, this.deps.db);
        const cacheHelper = new ServerCacheHelper(pluginId);
        const eventsHelper = new ServerEventsHelper(pluginId);
        const storageHelper = new ServerStorageHelper(pluginId);

        // Create the SDK with plugin fingerprinting
        const sdk: ServerSDK = {
            // Plugin identity - baked into every operation
            pluginId,

            // Execution context
            executionContext: this.deps.executionContext,

            // Settings with automatic plugin scoping
            settings: settingsHelper,

            // Cache with automatic plugin scoping
            cache: cacheHelper,

            // Events with automatic plugin scoping
            events: eventsHelper,

            // Storage with automatic plugin scoping
            storage: storageHelper,

            // Database access - could be wrapped to add plugin metadata
            db: this.createScopedDatabase(pluginId),

            // Logging with automatic plugin context
            log: this.createScopedLogger(pluginId),

            // Configuration
            config: this.deps.config,

            // Hook execution with plugin tracking
            callHook: async (hookName: string, payload: any) => {
                this.deps.log.debug(`Plugin ${pluginId} calling hook: ${hookName}`);
                return this.deps.pluginExecutor.executeHook(hookName, sdk, payload);
            },

            // RPC execution with plugin tracking
            callRPC: async (method, request) => {
                this.deps.log.debug(`Plugin ${pluginId} calling RPC: ${method}`);
                return this.deps.pluginExecutor.executeRpc(method as any, sdk, request);
            }
        };

        return sdk;
    }

    /**
     * Create a database adapter that automatically adds plugin context
     */
    private createScopedDatabase(pluginId: string): DatabaseAdapter {
        const originalDb = this.deps.db;

        // Wrap database operations to add plugin metadata
        return {
            ...originalDb,

            // Example: Auto-add plugin metadata to blog operations
            blogs: {
                ...originalDb.blogs,
                create: async (data: any) => {
                    // Add plugin ID to metadata
                    const enhancedData = {
                        ...data,
                        metadata: {
                            ...data.metadata,
                            createdByPlugin: pluginId
                        }
                    };
                    return originalDb.blogs.create(enhancedData);
                }
            },

            // Plugin-specific settings are already scoped via owner field
            settings: originalDb.settings,

            // Could add plugin-specific collections
            // e.g., plugin_data: createPluginCollection(pluginId)

            // Keep other collections as-is for now
            categories: originalDb.categories,
            tags: originalDb.tags,
            users: originalDb.users,
            plugins: originalDb.plugins,
            pluginHookMappings: originalDb.pluginHookMappings,
            comments: originalDb.comments,
            revisions: originalDb.revisions,
            media: originalDb.media,
            generated: originalDb.generated
        };
    }

    /**
     * Create a logger that automatically includes plugin context
     */
    private createScopedLogger(pluginId: string): Logger {
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

