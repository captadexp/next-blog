/**
 * Server-side plugin types
 */

import type {ServerSDK} from '../sdk/server';

/**
 * Server-side plugin module
 * This is what's exported from the plugin's server.ts
 */
export interface ServerPluginModule {
    hooks?: ServerHooksDefinition
    rpcs?: PluginRPCs
}

/**
 * RPC methods that plugins can expose
 */
export interface PluginRPCs {
    [rpcName: string]: (sdk: ServerSDK, request: any) => Promise<any>;
}

/**
 * RPC method definitions (for typed RPC calls)
 */
export interface RPCMethods {
    [rpcName: string]: {
        request: any;
        response: any;
    };
}

/**
 * Server hook definitions with payloads and responses
 */
export interface ServerHooks {
    // Blog hooks
    'blog:beforeCreate': { payload: { title: string; content: string; data?: any }; response: void | { data?: any } };
    'blog:afterCreate': { payload: { blogId: string; data?: any }; response: void };
    'blog:beforeUpdate': {
        payload: { blogId: string; updates: any; previousData?: any };
        response: void | { updates?: any }
    };
    'blog:afterUpdate': { payload: { blogId: string; data?: any; previousData?: any }; response: void };
    'blog:beforeDelete': { payload: { blogId: string; data?: any }; response: void | { cancel?: boolean } };
    'blog:afterDelete': { payload: { blogId: string; previousData?: any }; response: void };
    'blog:onRead': { payload: { blogId: string; data?: any }; response: void | { data?: any } };
    'blog:onList': { payload: { filters?: any; data?: any[] }; response: void | { data?: any[] } };

    // User hooks
    'user:beforeCreate': {
        payload: { entity: string; operation: string; data?: any };
        response: void | { data?: any }
    };
    'user:afterCreate': { payload: { entity: string; operation: string; id: string; data?: any }; response: void };
    'user:beforeUpdate': {
        payload: { entity: string; operation: string; id: string; data?: any; previousData?: any };
        response: void | { data?: any }
    };
    'user:afterUpdate': {
        payload: { entity: string; operation: string; id: string; data?: any; previousData?: any };
        response: void
    };
    'user:beforeDelete': {
        payload: { entity: string; operation: string; id: string; data?: any };
        response: void | { cancel?: boolean }
    };
    'user:afterDelete': {
        payload: { entity: string; operation: string; id: string; previousData?: any };
        response: void
    };
    'user:onRead': {
        payload: { entity: string; operation: string; id: string; data?: any };
        response: void | { data?: any }
    };
    'user:onList': {
        payload: { entity: string; operation: string; filters?: any; data?: any[] };
        response: void | { data?: any[] }
    };

    // Auth hooks
    'auth:beforeLogin': { payload: { username: string; metadata?: any }; response: void | { cancel?: boolean } };
    'auth:afterLogin': { payload: { userId: string; sessionId?: string }; response: void };
    'auth:beforeLogout': { payload: { userId: string; sessionId?: string }; response: void };
    'auth:afterLogout': { payload: { userId: string }; response: void };

    // Category hooks
    'category:beforeCreate': {
        payload: { entity: string; operation: string; data?: any };
        response: void | { data?: any }
    };
    'category:afterCreate': { payload: { entity: string; operation: string; id: string; data?: any }; response: void };
    'category:beforeUpdate': {
        payload: { entity: string; operation: string; id: string; data?: any; previousData?: any };
        response: void | { data?: any }
    };
    'category:afterUpdate': {
        payload: { entity: string; operation: string; id: string; data?: any; previousData?: any };
        response: void
    };
    'category:beforeDelete': {
        payload: { entity: string; operation: string; id: string; data?: any };
        response: void | { cancel?: boolean }
    };
    'category:afterDelete': {
        payload: { entity: string; operation: string; id: string; previousData?: any };
        response: void
    };
    'category:onRead': {
        payload: { entity: string; operation: string; id: string; data?: any };
        response: void | { data?: any }
    };
    'category:onList': {
        payload: { entity: string; operation: string; filters?: any; data?: any[] };
        response: void | { data?: any[] }
    };

    // Tag hooks
    'tag:beforeCreate': { payload: { entity: string; operation: string; data?: any }; response: void | { data?: any } };
    'tag:afterCreate': { payload: { entity: string; operation: string; id: string; data?: any }; response: void };
    'tag:beforeUpdate': {
        payload: { entity: string; operation: string; id: string; data?: any; previousData?: any };
        response: void | { data?: any }
    };
    'tag:afterUpdate': {
        payload: { entity: string; operation: string; id: string; data?: any; previousData?: any };
        response: void
    };
    'tag:beforeDelete': {
        payload: { entity: string; operation: string; id: string; data?: any };
        response: void | { cancel?: boolean }
    };
    'tag:afterDelete': {
        payload: { entity: string; operation: string; id: string; previousData?: any };
        response: void
    };
    'tag:onRead': {
        payload: { entity: string; operation: string; id: string; data?: any };
        response: void | { data?: any }
    };
    'tag:onList': {
        payload: { entity: string; operation: string; filters?: any; data?: any[] };
        response: void | { data?: any[] }
    };

    // Setting hooks
    'setting:beforeCreate': {
        payload: { entity: string; operation: string; data?: any };
        response: void | { data?: any }
    };
    'setting:afterCreate': { payload: { entity: string; operation: string; id: string; data?: any }; response: void };
    'setting:beforeUpdate': {
        payload: { entity: string; operation: string; id: string; data?: any; previousData?: any };
        response: void | { data?: any }
    };
    'setting:afterUpdate': {
        payload: { entity: string; operation: string; id: string; data?: any; previousData?: any };
        response: void
    };
    'setting:beforeDelete': {
        payload: { entity: string; operation: string; id: string; data?: any };
        response: void | { cancel?: boolean }
    };
    'setting:afterDelete': {
        payload: { entity: string; operation: string; id: string; previousData?: any };
        response: void
    };
    'setting:onRead': {
        payload: { entity: string; operation: string; id: string; data?: any };
        response: void | { data?: any }
    };
    'setting:onList': {
        payload: { entity: string; operation: string; filters?: any; data?: any[] };
        response: void | { data?: any[] }
    };

    // Cron hooks
    'cron:5-minute': { payload: { timestamp: number }; response: void | { success?: boolean; message?: string } };
    'cron:hourly': { payload: { timestamp: number }; response: void | { success?: boolean; message?: string } };
    'cron:daily': { payload: { timestamp: number }; response: void | { success?: boolean; message?: string } };

    // Plugin hooks
    'plugin:beforeInstall': { payload: CrudPayload; response: void | { cancel?: boolean } };
    'plugin:afterInstall': { payload: CrudPayload; response: void };
    'plugin:beforeUninstall': { payload: CrudPayload; response: void | { cancel?: boolean } };
    'plugin:afterUninstall': { payload: CrudPayload; response: void };
    'plugin:beforeEnable': { payload: CrudPayload; response: void | { cancel?: boolean } };
    'plugin:afterEnable': { payload: CrudPayload; response: void };
    'plugin:beforeDisable': { payload: CrudPayload; response: void | { cancel?: boolean } };
    'plugin:afterDisable': { payload: CrudPayload; response: void };


    // Generic pattern for any entity (plugins can define custom entities)
    [hookName: string]: {
        payload: any;
        response: any;
    };
}

// Server-specific hook types
export type HookTiming = 'before' | 'after' | 'on';
export type HookAction =
    | 'create'
    | 'update'
    | 'delete'
    | 'read'
    | 'list'
    | 'validate'
    | 'save'
    | 'load'
    | 'render'
    | 'mount'
    | 'unmount';
export type HookEntity = 'blog' | 'user' | 'tag' | 'category' | 'plugin' | 'setting' | 'auth' | string;

/**
 * Generic CRUD payload for server hooks
 */
export interface CrudPayload<T = any> {
    entity: HookEntity;
    operation: HookAction;
    id?: string;
    data?: T;
    previousData?: T;
    changes?: Partial<T>;
    user?: { id: string; name: string };
}

/**
 * Cron hook payload
 */
export interface CronPayload {
    executedAt: Date;
    interval: '5-minute' | 'hourly' | 'daily';
    metadata?: Record<string, any>;
}

/**
 * Pattern for server-side hook names
 */
export interface ServerHookPattern {
    entity: HookEntity;
    timing: HookTiming;
    action: HookAction;
}

/**
 * Server hooks definition - maps hook names to functions
 */
export type ServerHooksDefinition = {
    [hookName: string]: (
        sdk: ServerSDK,
        payload: any
    ) => Promise<any> | any;
};