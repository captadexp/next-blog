import type {PluginCache} from '@supergrowthai/types/server';

// Simple in-memory cache for server-side plugins
// TODO: Replace with Redis or proper caching solution for production
interface CacheEntry {
    value: any;
    expires: number | null;
}

const globalCache = new Map<string, CacheEntry>();

/**
 * Server-side cache helper for plugins with automatic fingerprinting
 */
export class ServerCacheHelper implements PluginCache {
    constructor(private readonly pluginId: string) {
    }

    /**
     * Get a cached value
     */
    async get<T = any>(key: string): Promise<T | null> {
        const fullKey = this.getKey(key);
        const entry = globalCache.get(fullKey);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (entry.expires !== null && Date.now() > entry.expires) {
            globalCache.delete(fullKey);
            return null;
        }

        return entry.value as T;
    }

    /**
     * Set a cached value with optional TTL
     */
    async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
        const fullKey = this.getKey(key);
        const expires = ttl ? Date.now() + (ttl * 1000) : null;

        globalCache.set(fullKey, {
            value,
            expires
        });
    }

    /**
     * Delete a cached value
     */
    async delete(key: string): Promise<void> {
        const fullKey = this.getKey(key);
        globalCache.delete(fullKey);
    }

    /**
     * Clear all cache for this plugin
     */
    async clear(): Promise<void> {
        const prefix = `plugin:${this.pluginId}:`;
        const keysToDelete: string[] = [];

        for (const key of globalCache.keys()) {
            if (key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        }

        for (const key of keysToDelete) {
            globalCache.delete(key);
        }
    }

    /**
     * Check if key exists
     */
    async has(key: string): Promise<boolean> {
        const fullKey = this.getKey(key);
        const entry = globalCache.get(fullKey);

        if (!entry) {
            return false;
        }

        // Check if expired
        if (entry.expires !== null && Date.now() > entry.expires) {
            globalCache.delete(fullKey);
            return false;
        }

        return true;
    }

    /**
     * Generate a cache key with plugin fingerprint
     */
    private getKey(key: string): string {
        return `plugin:${this.pluginId}:${key}`;
    }
}

// Cleanup expired entries periodically
setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of globalCache.entries()) {
        if (entry.expires !== null && now > entry.expires) {
            keysToDelete.push(key);
        }
    }

    for (const key of keysToDelete) {
        globalCache.delete(key);
    }
}, 60000); // Clean up every minute