import type {PluginSettings} from '@supergrowthai/next-blog-types/client';

/**
 * Client-side settings helper for plugins using localStorage
 *
 * Storage patterns:
 * - Plugin-specific: plugin_{pluginId}_{key}
 * - Global: global_{key}
 * - User-specific: user_{userId}_{key}
 */
export class ClientSettingsHelper implements PluginSettings {
    private readonly prefix: string;
    private readonly userId?: string;

    constructor(private readonly pluginId: string, userId?: string) {
        this.prefix = `plugin_${pluginId}_`;
        this.userId = userId;
    }

    /**
     * Get a plugin-specific setting from localStorage
     */
    get<T = any>(key: string): T | null {
        try {
            const value = localStorage.getItem(this.prefix + key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error(`Failed to get setting ${key} for plugin ${this.pluginId}:`, error);
            return null;
        }
    }

    /**
     * Set a plugin-specific setting in localStorage
     */
    set<T = any>(key: string, value: T): void {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
        } catch (error) {
            console.error(`Failed to set setting ${key} for plugin ${this.pluginId}:`, error);
        }
    }

    /**
     * Get a global setting (no plugin prefix) from localStorage
     */
    getGlobal<T = any>(key: string): T | null {
        try {
            const value = localStorage.getItem(`global_${key}`);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error(`Failed to get global setting ${key}:`, error);
            return null;
        }
    }

    /**
     * Set a global setting (no plugin prefix) in localStorage
     */
    setGlobal<T = any>(key: string, value: T): void {
        try {
            localStorage.setItem(`global_${key}`, JSON.stringify(value));
        } catch (error) {
            console.error(`Failed to set global setting ${key}:`, error);
        }
    }

    /**
     * Get a setting from another plugin's localStorage
     */
    getFromPlugin<T = any>(targetPluginId: string, key: string): T | null {
        try {
            const value = localStorage.getItem(`plugin_${targetPluginId}_${key}`);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error(`Failed to get setting ${key} from plugin ${targetPluginId}:`, error);
            return null;
        }
    }

    /**
     * Get a user-specific setting from localStorage
     */
    getUserSetting<T = any>(userId: string, key: string): T | null {
        try {
            const value = localStorage.getItem(`user_${userId}_${key}`);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error(`Failed to get user setting ${key} for user ${userId}:`, error);
            return null;
        }
    }

    /**
     * Set a user-specific setting in localStorage
     */
    setUserSetting<T = any>(userId: string, key: string, value: T): void {
        try {
            localStorage.setItem(`user_${userId}_${key}`, JSON.stringify(value));
        } catch (error) {
            console.error(`Failed to set user setting ${key} for user ${userId}:`, error);
        }
    }

    /**
     * Get a setting for the current user (if userId was provided in constructor)
     */
    getCurrentUserSetting<T = any>(key: string): T | null {
        if (!this.userId) {
            console.warn('No userId provided to ClientSettingsHelper');
            return null;
        }
        return this.getUserSetting(this.userId, key);
    }

    /**
     * Set a setting for the current user (if userId was provided in constructor)
     */
    setCurrentUserSetting<T = any>(key: string, value: T): void {
        if (!this.userId) {
            console.warn('No userId provided to ClientSettingsHelper');
            return;
        }
        this.setUserSetting(this.userId, key, value);
    }

    /**
     * Clear all settings for this plugin (utility method)
     */
    clearAll(): void {
        const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
        keys.forEach(key => localStorage.removeItem(key));
    }

    /**
     * Get all settings for this plugin (utility method)
     */
    getAll(): Record<string, any> {
        const settings: Record<string, any> = {};
        const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));

        keys.forEach(key => {
            const settingKey = key.replace(this.prefix, '');
            try {
                const value = localStorage.getItem(key);
                settings[settingKey] = value ? JSON.parse(value) : null;
            } catch {
                settings[settingKey] = localStorage.getItem(key);
            }
        });

        return settings;
    }
}