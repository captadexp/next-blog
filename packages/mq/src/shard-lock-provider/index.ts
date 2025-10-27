import FileShardLockProvider from "./FileShardLockProvider.js";
import IShardLockProvider from "./IShardLockProvider.js";

type LockProviderConfig = {
    provider: 'file';
} | {
    provider: 'redis';
} | {
    provider: 'mongo-redis';
};

class LockProviderFactory {
    static create(config: LockProviderConfig): IShardLockProvider {
        console.log("Creating shard lock provider with config:", JSON.stringify(config));
        // For standalone usage, always use FileShardLockProvider
        // Users can provide their own Redis-based providers if needed
        return new FileShardLockProvider();
    }
}

const configs: Record<string, LockProviderConfig> = {
    "standalone[redis-cfg]": {
        provider: 'mongo-redis'
    },
    standalone: {
        provider: 'mongo-redis'
    },
    serverless: {
        provider: 'mongo-redis'
    },
    development: {
        provider: 'redis'
    }
};

const getConfig = (): LockProviderConfig => {
    const env = process.env.ENV_TYPE || 'serverless';
    return configs[env] || configs.serverless;
};

const shardLockProvider = LockProviderFactory.create(getConfig());

export default shardLockProvider;