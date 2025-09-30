import type {BaseSDK, Logger, PluginCache, PluginEvents} from './base';
import type {DatabaseAdapter} from '../database/adapter';
import type {RPCMethods, ServerHooks} from '../plugin';

export interface ServerConfig {
    environment?: 'development' | 'staging' | 'production';
    debug?: boolean;
    baseUrl?: string;
    features?: {
        caching?: boolean;
        logging?: boolean;
    };
}

export interface ServerSDK extends BaseSDK {
    log: Logger;
    db: DatabaseAdapter;
    config: ServerConfig;
    cache?: PluginCache;
    events?: PluginEvents;
    storage?: PluginStorage;
    callHook: (hookName: string, payload: any) => Promise<any>;
    callRPC?: <T extends keyof RPCMethods>(
        method: T,
        request: RPCMethods[T]['request']
    ) => Promise<RPCMethods[T]['response']>;
}

export type ServerPluginHook<T extends keyof ServerHooks = keyof ServerHooks> = (
    sdk: ServerSDK,
    payload: ServerHooks[T]['payload']
) => Promise<ServerHooks[T]['response']> | ServerHooks[T]['response'];

export type RPCHandler<T extends keyof RPCMethods = keyof RPCMethods> = (
    sdk: ServerSDK,
    request: RPCMethods[T]['request']
) => Promise<RPCMethods[T]['response']>;

export interface PluginStorage {
    save(path: string, content: Buffer | Uint8Array | string): Promise<string>;
    read(path: string): Promise<Buffer>;
    delete(path: string): Promise<void>;
    list(prefix?: string): Promise<string[]>;
    exists(path: string): Promise<boolean>;
    getUrl(path: string): Promise<string | null>;
}