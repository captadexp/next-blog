import type {
    DatabaseAdapter,
    Logger,
    Plugin,
    ServerConfig,
    ServerSDK,
    User
} from '@supergrowthai/next-blog-types/server';
import {ServerSettingsHelper} from './settings-helper.server.js';
import {ServerCacheHelper} from './cache-helper.server.js';
import {ServerEventsHelper} from './events-helper.server.js';
import {StorageFactory} from '../storage/storage-factory.js';
import {VERSION_INFO} from '../version.js';
import {PluginExecutor} from "./plugin-executor.server.ts";

/**
 * Dependencies required to create a server SDK instance
 */
export interface ServerSDKDependencies {
    db: DatabaseAdapter;
    log: Logger;
    config: ServerConfig;
    executionContext: User | null;
    pluginExecutor: PluginExecutor
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
    async createSDK(plugin: Plugin): Promise<ServerSDK> {
        // Create plugin-specific helpers
        const settingsHelper = new ServerSettingsHelper(plugin, this.deps.db);
        const cacheHelper = new ServerCacheHelper(plugin.id);
        const eventsHelper = new ServerEventsHelper(plugin.id);
        const storageHelper = await StorageFactory.create(plugin.id, this.deps.db);

        // Create the SDK with plugin fingerprinting
        const sdk: ServerSDK = {
            // Plugin identity - baked into every operation
            pluginId: plugin.id,

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
            db: this.createScopedDatabase(plugin.id),

            // Logging with automatic plugin context
            log: this.createScopedLogger(plugin.id),

            // Configuration
            config: this.deps.config,

            // System information available at runtime
            system: {
                version: VERSION_INFO.version,
                buildTime: VERSION_INFO.buildTime,
                buildMode: VERSION_INFO.buildMode
            },

            // Hook execution with plugin tracking
            callHook: async (hookName, payload) => {
                this.deps.log.debug(`Plugin ${plugin.id} calling hook: ${hookName}`);
                return this.deps.pluginExecutor.executeHook(String(hookName), sdk, payload);
            },

            // RPC execution with plugin tracking
            callRPC: async (method, request) => {
                this.deps.log.debug(`Plugin ${plugin.id} calling RPC: ${method}`);
                return this.deps.pluginExecutor.executeRpc(String(method), sdk, request);
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

