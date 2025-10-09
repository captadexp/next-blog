/**
 * Server-side plugin types
 */

import type {RPCMethods} from './common';
import type {ServerHooksDefinition, ServerRPCsDefinition} from './types';
import type {
    LlmsData,
    RobotsData,
    RssData,
    SeoHookPayload,
    SeoHookPayloadWithDb,
    SitemapData,
    SitemapIndexData
} from '../seo';
import type {ContentObject} from "@supergrowthai/plugin-dev-kit/content";

/**
 * Server-side plugin module
 * This is what's exported from the plugin's server.ts
 */
export interface ServerPluginModule {
    hooks?: ServerHooksDefinition<ServerHooks>
    rpcs?: ServerRPCsDefinition<RPCMethods>
}

/**
 * Server hook definitions with payloads and responses
 */
export interface ServerHooks extends Record<string, { payload?: any; response: any }> {
    // Blog hooks
    'blog:beforeCreate': {
        payload: { title: string; content: ContentObject; data?: any };
        response: void | { data?: any }
    };
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
    'plugins:loaded': { payload: SystemInitPayload; response: void | { success?: boolean; message?: string } };

    'plugin:beforeInstall': { payload: CrudPayload; response: void | { cancel?: boolean } };
    'plugin:afterInstall': { payload: CrudPayload; response: void };
    'plugin:beforeUninstall': { payload: CrudPayload; response: void | { cancel?: boolean } };
    'plugin:afterUninstall': { payload: CrudPayload; response: void };
    'plugin:beforeEnable': { payload: CrudPayload; response: void | { cancel?: boolean } };
    'plugin:afterEnable': { payload: CrudPayload; response: void };
    'plugin:beforeDisable': { payload: CrudPayload; response: void | { cancel?: boolean } };
    'plugin:afterDisable': { payload: CrudPayload; response: void };
    'plugin:update': { payload: PluginUpdatePayload; response: void | { success?: boolean; message?: string } };

    // System hooks
    'system:update': { payload: SystemUpdatePayload; response: void | { success?: boolean; message?: string } };

    // SEO hooks
    'seo:sitemap': {
        payload: SeoHookPayloadWithDb;
        response: void | { data: SitemapData } | Response;
    };
    'seo:sitemap-index': {
        payload: SeoHookPayload;
        response: void | { data: SitemapIndexData } | Response;
    };
    'seo:robots.txt': {
        payload: SeoHookPayload;
        response: void | { data: RobotsData } | Response;
    };
    'seo:llms.txt': {
        payload: SeoHookPayloadWithDb;
        response: void | { data: LlmsData } | Response;
    };
    'seo:rss': {
        payload: SeoHookPayloadWithDb;
        response: void | { data: RssData } | Response;
    };
}

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
 * Plugin update hook payload
 */
export interface PluginUpdatePayload {
    pluginId: string;
    fromVersion: string;
    toVersion: string;
    data?: any;
}

/**
 * System initialization hook payload
 */
export interface SystemInitPayload {
    currentVersion: string;
    timestamp: number;
}

/**
 * System update hook payload
 */
export interface SystemUpdatePayload {
    fromVersion: string;
    toVersion: string;
    timestamp: number;
}
