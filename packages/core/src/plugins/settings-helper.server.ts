import type {DatabaseAdapter, PluginSettings} from '@supergrowthai/types/server';
import {createId} from '@supergrowthai/types/server';
import {getSystemPluginId} from '../utils/defaultSettings.js';

// Global database reference for backwards compatibility
let globalDb: DatabaseAdapter | null = null;

/**
 * Initialize the settings helper with a database adapter (for backwards compatibility)
 */
export function initializeSettingsHelper(db: DatabaseAdapter) {
    globalDb = db;
}

/**
 * Server-side settings helper for plugins
 * Uses the database settings collection with owner field for plugin isolation
 *
 * Access patterns:
 * - Plugin-specific: plugin:{pluginId}:{key} owned by system plugin
 * - Global: {key} owned by system plugin
 * - User-specific: user:{userId}:{key} owned by user
 */
export class ServerSettingsHelper implements PluginSettings {
    private readonly db: DatabaseAdapter;
    private readonly currentUserId?: string; // Current user context for the plugin

    constructor(private readonly pluginId: string, db?: DatabaseAdapter, currentUserId?: string) {
        // Use injected db or fall back to global (for backwards compatibility)
        this.db = db || globalDb!;
        if (!this.db) {
            throw new Error('Database not provided and global database not initialized.');
        }
        this.currentUserId = currentUserId;
    }

    /**
     * Get a plugin-specific setting
     * Plugin settings are stored with system plugin ownership but prefixed keys
     */
    async get<T = any>(key: string): Promise<T | null> {
        const systemPluginId = await getSystemPluginId(this.db);
        const prefixedKey = `plugin:${this.pluginId}:${key}`;

        const setting = await this.db.settings.findOne({
            key: prefixedKey,
            ownerId: createId.plugin(systemPluginId),
            ownerType: 'plugin'
        });

        return setting ? (setting.value as T) : null;
    }

    /**
     * Set a plugin-specific setting
     * Plugin settings are stored with system plugin ownership but prefixed keys
     */
    async set<T = any>(key: string, value: T): Promise<void> {
        const systemPluginId = await getSystemPluginId(this.db);
        const systemPluginBrandedId = createId.plugin(systemPluginId);
        const prefixedKey = `plugin:${this.pluginId}:${key}`;

        const existingSetting = await this.db.settings.findOne({
            key: prefixedKey,
            ownerId: systemPluginBrandedId as any
        });

        if (existingSetting) {
            await this.db.settings.updateOne(
                {_id: existingSetting._id},
                {value, ownerType: 'plugin'}
            );
        } else {
            await this.db.settings.create({
                key: prefixedKey,
                value: value as any,
                ownerId: systemPluginBrandedId,
                ownerType: 'plugin'
            });
        }
    }

    /**
     * Get a global setting (owned by system plugin)
     */
    async getGlobal<T = any>(key: string): Promise<T | null> {
        const systemPluginId = await getSystemPluginId(this.db);

        const setting = await this.db.settings.findOne({
            key,
            ownerId: createId.plugin(systemPluginId),
            ownerType: 'plugin'
        });

        return setting ? (setting.value as T) : null;
    }

    /**
     * Set a global setting (owned by system plugin)
     */
    async setGlobal<T = any>(key: string, value: T): Promise<void> {
        const systemPluginId = await getSystemPluginId(this.db);
        const pluginId = createId.plugin(systemPluginId);

        //fixme we should be using upsert here
        const existingSetting = await this.db.settings.findOne({
            key,
            ownerId: pluginId
        });

        if (existingSetting) {
            await this.db.settings.updateOne(
                {_id: existingSetting._id},
                {value, ownerType: 'plugin'}
            );
        } else {
            await this.db.settings.create({
                key,
                value: value as any,
                ownerId: pluginId,
                ownerType: 'plugin'
            });
        }
    }

    /**
     * Get a setting from another plugin
     */
    async getFromPlugin<T = any>(targetPluginId: string, key: string): Promise<T | null> {
        const systemPluginId = await getSystemPluginId(this.db);
        const prefixedKey = `plugin:${targetPluginId}:${key}`;

        // TODO: Add permission check - should plugins be able to read each other's settings?
        const setting = await this.db.settings.findOne({
            key: prefixedKey,
            ownerId: createId.plugin(systemPluginId),
            ownerType: 'plugin'
        });

        return setting ? (setting.value as T) : null;
    }

    /**
     * Get a user-specific setting
     */
    async getUserSetting<T = any>(userId: string, key: string): Promise<T | null> {
        const prefixedKey = `user:${userId}:${key}`;

        const setting = await this.db.settings.findOne({
            key: prefixedKey,
            ownerId: createId.user(userId),
            ownerType: 'user'
        });

        return setting ? (setting.value as T) : null;
    }

    /**
     * Set a user-specific setting
     * Plugins can only set settings for the current user
     */
    async setUserSetting<T = any>(userId: string, key: string, value: T): Promise<void> {
        // Security: Plugins can only write to current user's settings
        if (this.currentUserId && userId !== this.currentUserId) {
            throw new Error('Plugins can only modify settings for the current user');
        }

        const prefixedKey = `user:${userId}:${key}`;

        const existingSetting = await this.db.settings.findOne({
            key: prefixedKey,
            ownerId: createId.user(userId) as any
        });

        if (existingSetting) {
            await this.db.settings.updateOne(
                {_id: existingSetting._id},
                {value, ownerType: 'user'}
            );
        } else {
            await this.db.settings.create({
                key: prefixedKey,
                value: value as any,
                ownerId: createId.user(userId),
                ownerType: 'user'
            });
        }
    }

    /**
     * Get current user's setting (convenience method)
     */
    async getCurrentUserSetting<T = any>(key: string): Promise<T | null> {
        if (!this.currentUserId) {
            return null;
        }
        return this.getUserSetting(this.currentUserId, key);
    }

    /**
     * Set current user's setting (convenience method)
     */
    async setCurrentUserSetting<T = any>(key: string, value: T): Promise<void> {
        if (!this.currentUserId) {
            throw new Error('No current user context available');
        }
        return this.setUserSetting(this.currentUserId, key, value);
    }
}

/**
 * Create a settings helper bound to a specific plugin ID
 */
export function createSettingsHelper(pluginId: string): PluginSettings {
    return new ServerSettingsHelper(pluginId);
}