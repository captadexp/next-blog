import type {PluginCache} from '@supergrowthai/types/client';

/**
 * Client-side cache helper using localStorage with automatic plugin fingerprinting
 */
export class ClientCacheHelper implements PluginCache {
    private readonly prefix: string;

    constructor(private readonly pluginId: string) {
        this.prefix = `plugin-cache:${pluginId}:`;
    }

    /**
     * Get a cached value
     */
    async get<T = any>(key: string): Promise<T | null> {
        const entry = this.getCacheEntry(key);
        return entry ? entry.value : null;
    }

    /**
     * Set a cached value with optional TTL
     */
    async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
        try {
            const entry = {
                value,
                expires: ttl ? Date.now() + (ttl * 1000) : null
            };

            localStorage.setItem(this.prefix + key, JSON.stringify(entry));
        } catch (error) {
            console.error(`Failed to set cache for key ${key}:`, error);
            // If localStorage is full, try to clean up expired entries
            this.cleanupExpired();
        }
    }

    /**
     * Delete a cached value
     */
    async delete(key: string): Promise<void> {
        localStorage.removeItem(this.prefix + key);
    }

    /**
     * Clear all cache for this plugin
     */
    async clear(): Promise<void> {
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                keysToRemove.push(key);
            }
        }

        for (const key of keysToRemove) {
            localStorage.removeItem(key);
        }
    }

    /**
     * Check if key exists
     */
    async has(key: string): Promise<boolean> {
        const entry = this.getCacheEntry(key);
        return entry !== null;
    }

    /**
     * Get cache entry with expiry check
     */
    private getCacheEntry(key: string): { value: any; expires: number | null } | null {
        try {
            const stored = localStorage.getItem(this.prefix + key);
            if (!stored) return null;

            const entry = JSON.parse(stored);

            // Check expiry
            if (entry.expires !== null && Date.now() > entry.expires) {
                localStorage.removeItem(this.prefix + key);
                return null;
            }

            return entry;
        } catch (error) {
            console.error(`Failed to get cache entry for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Clean up expired entries for this plugin
     */
    private cleanupExpired(): void {
        const now = Date.now();
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                try {
                    const stored = localStorage.getItem(key);
                    if (stored) {
                        const entry = JSON.parse(stored);
                        if (entry.expires !== null && now > entry.expires) {
                            keysToRemove.push(key);
                        }
                    }
                } catch {
                    // Invalid entry, remove it
                    keysToRemove.push(key);
                }
            }
        }

        for (const key of keysToRemove) {
            localStorage.removeItem(key);
        }
    }
}