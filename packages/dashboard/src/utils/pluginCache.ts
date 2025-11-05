import {IDBPDatabase, openDB} from 'idb';

const DB_NAME = 'PluginCacheDB';
const STORE_NAME = 'plugins';
const DB_VERSION = 1;
const CACHE_EXPIRY_HOURS = 4; // Cache expires after 4 hours

interface PluginCacheEntry {
    url: string;
    code: string;
    timestamp: number;
}

class PluginCache {
    private readonly dbPromise: Promise<IDBPDatabase<PluginCacheEntry>>;

    constructor() {
        this.dbPromise = openDB<PluginCacheEntry>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, {keyPath: 'url'});
                }
            },
        });
    }

    async get(url: string): Promise<string | undefined> {
        const db = await this.dbPromise;
        const entry = await db.get(STORE_NAME, url);

        if (!entry) return undefined;

        // Check if entry has expired
        const now = Date.now();
        const expiryTime = entry.timestamp + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000);

        if (now > expiryTime) {
            // Entry has expired, remove it
            await db.delete(STORE_NAME, url);
            return undefined;
        }

        return entry.code;
    }

    async set(url: string, code: string): Promise<void> {
        const db = await this.dbPromise;
        await db.put(STORE_NAME, {url, code, timestamp: Date.now()});
    }

    async clear(): Promise<void> {
        const db = await this.dbPromise;
        await db.clear(STORE_NAME);
    }

    async cleanupExpired(): Promise<number> {
        const db = await this.dbPromise;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const now = Date.now();
        const expiryThreshold = now - (CACHE_EXPIRY_HOURS * 60 * 60 * 1000);

        let deletedCount = 0;
        let cursor = await store.openCursor();

        while (cursor) {
            const entry = cursor.value as PluginCacheEntry;
            if (entry.timestamp < expiryThreshold) {
                await cursor.delete();
                deletedCount++;
            }
            cursor = await cursor.continue();
        }

        await tx.done;
        return deletedCount;
    }
}

export const pluginCache = new PluginCache();