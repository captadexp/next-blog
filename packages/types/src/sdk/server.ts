import type {BaseSDK, Logger, PluginCache, PluginEvents} from './base';
import type {DatabaseAdapter} from '../database/adapter';
import type {ServerHooks} from '../plugin/server';
import type {RPCMethods} from '../plugin/common';

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
    storage?: PluginStorage;
    callRPC: <T extends keyof RPCMethods>(
        method: T,
        request: RPCMethods[T]['request']
    ) => Promise<RPCMethods[T]['response']>;
    callHook: <T extends keyof ServerHooks>(
        hookName: T,
        payload: ServerHooks[T]['payload']
    ) => Promise<ServerHooks[T]['response']>;
}

export interface PluginStorage {
    save(path: string, content: Buffer | Uint8Array | string): Promise<string>;

    read(path: string): Promise<Buffer>;

    delete(path: string): Promise<void>;

    list(prefix?: string): Promise<string[]>;

    exists(path: string): Promise<boolean>;

    getUrl(path: string): Promise<string | null>;
}