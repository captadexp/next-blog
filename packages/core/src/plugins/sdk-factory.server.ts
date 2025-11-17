import type {DatabaseAdapter, Logger, Plugin, ServerSDK} from '@supergrowthai/next-blog-types/server';
import pluginManager from './pluginManager.js';
import {ServerCacheHelper} from './cache-helper.server.js';
import {ServerEventsHelper} from './events-helper.server.js';
import {StorageFactory} from '../storage/storage-factory.js';
import {VERSION_INFO} from '../version.js';
import {PluginExecutor} from "./plugin-executor.server.js";
import {
    createScopedBlogDb,
    createScopedCategoryDb,
    createScopedCommentsDb,
    createScopedMediaDb,
    createScopedPluginDb,
    createScopedPluginMappingDb,
    createScopedRevisionsDb,
    createScopedTagDb,
    createScopedUserDb,
} from '../services/ScopedCollectionDb.js';
import {ServerSettingsHelper} from "./settings-helper.server.js";

/**
 * Handle internal system hooks
 */
async function internalHooks(hookName: string, db: DatabaseAdapter, log: Logger, payload: any): Promise<void> {
    // Special handling for system:update - update all internal plugins
    // we can add pluginManager to the sdk object if plugin.isSystem==true so we dont need to do this special handling.
    if (hookName === 'system:update') {
        log.info('Processing system:update hook - updating internal plugins');
        await pluginManager.updateInternalPlugins(db);
    }
}

/**
 * Dependencies required to create a server SDK instance
 */
export interface ServerSDKDependencies {
    db: DatabaseAdapter;
    log: Logger;
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

        if (!plugin.id)
            throw new Error(`Plugin re-install ${plugin.name}`);

        const settingsHelper = new ServerSettingsHelper(plugin, this.deps.db);
        const cacheHelper = new ServerCacheHelper(plugin.id);
        const eventsHelper = new ServerEventsHelper(plugin.id);
        const storageHelper = await StorageFactory.create(plugin.id, this.deps.db);

        // Create the SDK with plugin fingerprinting
        const sdk: ServerSDK = {
            // Plugin identity - baked into every operation
            pluginId: plugin.id,

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

            // System information available at runtime
            system: {
                version: VERSION_INFO.version,
                buildTime: VERSION_INFO.buildTime,
                buildMode: VERSION_INFO.buildMode
            },

            // Hook execution with plugin tracking
            callHook: async (hookName, payload) => {
                this.deps.log.debug(`Plugin ${plugin.id} calling hook: ${hookName}`);

                await internalHooks(String(hookName), this.deps.db, this.deps.log, payload);

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

        return {
            ...originalDb,

            // Scoped collections with automatic metadata scoping
            blogs: createScopedBlogDb(originalDb.blogs, pluginId),
            comments: createScopedCommentsDb(originalDb.comments, pluginId),
            revisions: createScopedRevisionsDb(originalDb.revisions, pluginId),
            media: createScopedMediaDb(originalDb.media, pluginId),
            categories: createScopedCategoryDb(originalDb.categories, pluginId),
            tags: createScopedTagDb(originalDb.tags, pluginId),
            users: createScopedUserDb(originalDb.users, pluginId),

            // Read-only scoped collections
            plugins: createScopedPluginDb(originalDb.plugins, pluginId),
            pluginHookMappings: createScopedPluginMappingDb(originalDb.pluginHookMappings, pluginId),

            // Collections without scoping
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

