import {BaseCacheProvider, Pipeline} from "memoose-js";
import {CacheKey, TTL} from "memoose-js/dist/adapters/base";

interface CacheEntry<T> {
    value: T;
    expiresAt?: number;
}

class MemoryPipeline<T> implements Pipeline<T> {
    private operations: (() => Promise<any>)[] = [];
    private cache: Map<string, CacheEntry<T>>;

    constructor(cache: Map<string, CacheEntry<T>>) {
        this.cache = cache;
    }

    get(key: CacheKey): Pipeline<T> {
        this.operations.push(async () => {
            const entry = this.cache.get(key);
            if (!entry || (entry.expiresAt && entry.expiresAt < Date.now())) {
                return null;
            }
            return entry.value;
        });
        return this;
    }

    set(key: CacheKey, data: T, ttl?: number): Pipeline<T> {
        this.operations.push(async () => {
            const entry: CacheEntry<T> = {
                value: data,
                expiresAt: ttl ? Date.now() + ttl * 1000 : undefined
            };
            this.cache.set(key, entry);
            return "OK";
        });
        return this;
    }

    del(key: CacheKey): Pipeline<T> {
        this.operations.push(async () => {
            return this.cache.delete(key) ? 1 : 0;
        });
        return this;
    }

    expire(key: CacheKey, new_ttl_from_now: number): Pipeline<T> {
        this.operations.push(async () => {
            const entry = this.cache.get(key);
            if (!entry) return 0;
            entry.expiresAt = Date.now() + new_ttl_from_now * 1000;
            return 1;
        });
        return this;
    }

    async exec(): Promise<any[]> {
        const results = await Promise.all(this.operations.map(op => op()));
        this.operations = [];
        return results;
    }
}

class InMemoryCacheProvider<T> implements BaseCacheProvider<T> {
    readonly storesAsObj: boolean = false;
    private readonly cache: Map<string, CacheEntry<T>>;

    constructor() {
        this.cache = new Map();
    }

    name(): string {
        return "memory";
    }

    async get(key: CacheKey): Promise<T | null> {
        const entry = this.cache.get(key);
        if (!entry || this.isExpired(entry)) {
            if (entry) this.cache.delete(key);
            return null;
        }
        return entry.value;
    }

    async mget(...keys: CacheKey[]): Promise<(T | null)[]> {
        return Promise.all(keys.map(key => this.get(key)));
    }

    async mset(...keyValues: [CacheKey, T][]): Promise<"OK" | null> {
        for (const [key, value] of keyValues) {
            await this.set(key, value);
        }
        return "OK";
    }

    async set(key: CacheKey, data: T, ttl?: TTL): Promise<"OK" | null> {
        const entry: CacheEntry<T> = {
            value: data,
            expiresAt: ttl ? Date.now() + ttl * 1000 : undefined
        };
        this.cache.set(key, entry);
        return "OK";
    }

    async del(...keys: CacheKey[]): Promise<number> {
        let count = 0;
        for (const key of keys) {
            if (this.cache.delete(key)) {
                count++;
            }
        }
        return count;
    }

    async expire(key: CacheKey, new_ttl_from_now: TTL): Promise<0 | 1> {
        const entry = this.cache.get(key);
        if (!entry) return 0;
        entry.expiresAt = Date.now() + new_ttl_from_now * 1000;
        return 1;
    }

    pipeline(): Pipeline<T> {
        return new MemoryPipeline<T>(this.cache);
    }

    private isExpired(entry: CacheEntry<T>): boolean {
        return entry.expiresAt !== undefined && entry.expiresAt < Date.now();
    }
}

export default InMemoryCacheProvider;