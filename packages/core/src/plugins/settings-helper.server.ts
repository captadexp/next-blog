import type {DatabaseAdapter, PluginSettings} from '@supergrowthai/types/server';
import {createId} from '@supergrowthai/types/server';

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
 */
export class ServerSettingsHelper implements PluginSettings {
    private readonly db: DatabaseAdapter;

    constructor(private readonly pluginId: string, db?: DatabaseAdapter) {
        // Use injected db or fall back to global (for backwards compatibility)
        this.db = db || globalDb!;
        if (!this.db) {
            throw new Error('Database not provided and global database not initialized.');
        }
    }

    /**
     * Get a plugin-specific setting
     */
    async get<T = any>(key: string): Promise<T | null> {
        const setting = await this.db.settings.findOne({
            key,
            ownerId: createId.user(this.pluginId)
        });

        return setting ? (setting.value as T) : null;
    }

    /**
     * Set a plugin-specific setting
     */
    async set<T = any>(key: string, value: T): Promise<void> {
        const existingSetting = await this.db.settings.findOne({
            key,
            ownerId: createId.user(this.pluginId)
        });

        if (existingSetting) {
            await this.db.settings.updateOne(
                {_id: existingSetting._id},
                {value}
            );
        } else {
            await this.db.settings.create({
                key,
                value: value as any,
                ownerId: createId.user(this.pluginId)  // HACK: Using user ID for plugin ID
            });
        }
    }

    /**
     * Get a global setting (no plugin prefix)
     */
    async getGlobal<T = any>(key: string): Promise<T | null> {
        const setting = await this.db.settings.findOne({
            key,
            ownerId: createId.user('global')
        });

        return setting ? (setting.value as T) : null;
    }

    /**
     * Set a global setting (no plugin prefix)
     */
    async setGlobal<T = any>(key: string, value: T): Promise<void> {
        //fixme we should be using upsert here
        const existingSetting = await this.db.settings.findOne({
            key,
            ownerId: createId.user('global')
        });

        if (existingSetting) {
            await this.db.settings.updateOne(
                {_id: existingSetting._id},
                {value}
            );
        } else {
            await this.db.settings.create({
                key,
                value: value as any,
                ownerId: createId.user('global')
            });
        }
    }

    /**
     * Get a setting from another plugin
     */
    async getFromPlugin<T = any>(targetPluginId: string, key: string): Promise<T | null> {
        // TODO: Add permission check - should plugins be able to read each other's settings?
        const setting = await this.db.settings.findOne({
            key,
            ownerId: createId.user(targetPluginId)
        });

        return setting ? (setting.value as T) : null;
    }
}

/**
 * Create a settings helper bound to a specific plugin ID
 */
export function createSettingsHelper(pluginId: string): PluginSettings {
    return new ServerSettingsHelper(pluginId);
}