import type {BaseSDK, Logger, PluginCache, PluginEvents} from './base';
import type {DatabaseAdapter} from '../database/adapter';
import type {CallServerHookFunction, CallServerRPCFunction, RPCMethods, ServerHooks} from '../plugin';

export interface ServerConfig {
    environment?: 'development' | 'staging' | 'production';
    debug?: boolean;
    baseUrl?: string;
    features?: {
        caching?: boolean;
        logging?: boolean;
    };
}

export interface SystemInfo {
    version: string;
    buildTime: string;
    buildMode: string;
}

export interface ServerSDK extends BaseSDK {
    log: Logger;
    db: DatabaseAdapter;
    config: ServerConfig;
    system: SystemInfo;
    cache?: PluginCache;
    events?: PluginEvents;
    storage?: StorageAdapter;
    callRPC: CallServerRPCFunction<RPCMethods>;
    callHook: CallServerHookFunction<ServerHooks>;
}

export interface StorageAdapter {
    save(path: string, content: Buffer | Uint8Array | string): Promise<string>;

    read(path: string): Promise<Buffer>;

    delete(path: string): Promise<void>;

    list(prefix?: string): Promise<string[]>;

    exists(path: string): Promise<boolean>;

    getUrl(path: string): Promise<string | null>;
}