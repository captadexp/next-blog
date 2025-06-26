import {IDBPDatabase, openDB} from 'idb';

const DB_NAME = 'PluginCacheDB';
const STORE_NAME = 'plugins';
const DB_VERSION = 1;

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
        return entry?.code;
    }

    async set(url: string, code: string): Promise<void> {
        const db = await this.dbPromise;
        await db.put(STORE_NAME, {url, code, timestamp: Date.now()});
    }

    async clear(): Promise<void> {
        const db = await this.dbPromise;
        await db.clear(STORE_NAME);
    }
}

export const pluginCache = new PluginCache();