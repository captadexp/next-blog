import {BaseCacheProvider, Pipeline, stats} from "memoose-js";
import {CacheKey, TTL} from "memoose-js/dist/adapters/base";

class DisableCachePipeline implements Pipeline<null> {
    actions: [string, ...any[]][] = [];

    del(key: CacheKey) {
        this.actions.push(["del", key]);
        return this;
    }

    expire(key: CacheKey, new_ttl_from_now: number): Pipeline<null> {
        this.actions.push(["expire", key, new_ttl_from_now]);
        return this;
    }

    async exec(): Promise<any[]> {
        return this.actions.map(([action, ...args]) => {
            switch (action) {
                case "get":
                case "del":
                case "expire":
                case "set":
                default:
                    return null;
            }
        })
    }

    get(key: CacheKey): Pipeline<null> {
        this.actions.push(["get", key]);
        return this
    }

    set(key: CacheKey, data: null, ttl?: TTL): Pipeline<null> {
        this.actions.push(["set", key, data, ttl]);
        return this
    }

}

class DisabledCache implements BaseCacheProvider<null> {
    readonly storesAsObj: boolean = false;

    constructor() {
        stats[this.name()] = {};
    }

    name(): string {
        return "disabled-cache";
    }

    pipeline(): Pipeline<any> {
        return new DisableCachePipeline();
    }

    async get(key: CacheKey): Promise<null> {
        return null;
    }

    async mget(...key: CacheKey[]): Promise<null[]> {
        return key.map(() => null);
    }

    async mset(...key: [string, any][]): Promise<"OK" | null> {
        return "OK"
    }

    async set(key: CacheKey, data: any, ttl?: TTL): Promise<"OK" | null> {
        return "OK"
    }

    async del(...key: CacheKey[]): Promise<number> {
        return key.length;
    }

    async expire(key: CacheKey, new_ttl_from_now: TTL): Promise<0 | 1> {
        return 1;
    }
}


export default DisabledCache;
