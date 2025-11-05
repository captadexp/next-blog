import type {CacheProvider,} from "memoose-js";
import {RedisCacheProvider} from "memoose-js";
import DisabledCache from "./DisabledCache";
import RedisClusterCacheProvider from "./RedisClusterCacheProvider";
import type {ClusterOptions, RedisOptions} from "ioredis";
import type {ClusterNode} from "ioredis/built/cluster";
import InMemoryCacheProvider from "./InMemoryCacheProvider";

interface CacheConfig {
    provider: 'redis' | 'memory' | 'disabled';
    redis?: ({ type: "cluster", nodes: ClusterNode[], options: ClusterOptions })
        | ({ type: "standalone" } & RedisOptions);
}

class CacheFactory {
    static create(config: CacheConfig): CacheProvider<any> {
        console.log("Creating cache with config:", JSON.stringify(config));
        switch (config.provider) {
            case 'redis':
                if (!config.redis)
                    throw new Error('Redis configuration required');

                if (config.redis.type === 'cluster') {
                    return new RedisClusterCacheProvider('redis', config.redis, false);
                } else {
                    return new RedisCacheProvider('redis', config.redis, false);
                }
            case 'memory':
                return new InMemoryCacheProvider();
            case 'disabled':
            default:
                return new DisabledCache();
        }
    }
}

const configs: Record<string, CacheConfig> = {
    "standalone[redis-cfg]": {
        provider: 'redis',
        redis: {
            type: 'cluster',
            nodes: [{
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379')
            }],
            options: {
                dnsLookup: (address, callback) => callback(null, address),
                redisOptions: {
                    tls: {},
                },
                lazyConnect: true
            },
        }
    },
    standalone: {
        provider: 'redis',
        redis: {
            type: 'standalone',
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            lazyConnect: false,
        }
    },
    serverless: {
        provider: 'memory' //redis as a service later?
    }
};

const getConfig = (): CacheConfig => {
    const env = process.env.ENV_TYPE || 'serverless';
    return configs[env] || configs.serverless;
};

const cacheProvider = CacheFactory.create(getConfig());

export default cacheProvider
