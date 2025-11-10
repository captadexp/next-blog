import type {BaseSDK, Logger, PluginCache, PluginEvents, PluginSettings, SystemInfo} from './base';
import type {DatabaseAdapter} from '../database/adapter';
import type {CallServerHookFunction, CallServerRPCFunction, RPCMethods, ServerHooks} from '../plugin';

export type * from "./base"

export interface ServerSDK extends BaseSDK {
    log: Logger;
    db: DatabaseAdapter;
    system: SystemInfo;
    cache?: PluginCache;
    events?: PluginEvents;
    storage?: StorageAdapter;
    callRPC: CallServerRPCFunction<RPCMethods>;
    callHook: CallServerHookFunction<ServerHooks>;

    //we should remove this and update the plugins in the future
    settings: PluginSettings;
}

export interface StorageAdapter {
    save(path: string, content: Buffer | Uint8Array | string): Promise<string>;

    read(path: string): Promise<Buffer>;

    delete(path: string): Promise<void>;

    list(prefix?: string): Promise<string[]>;

    exists(path: string): Promise<boolean>;

    getUrl(path: string): Promise<string | null>;
}