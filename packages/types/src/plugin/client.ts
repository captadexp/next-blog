import type {ClientSDK, JSXElement} from '../sdk/client';
import type {RPCMethods} from './common';

export interface ClientPluginModule {
    hasSettingsPanel?: boolean;
    hooks?: ClientHooksDefinition,
    rpcs?: {
        [K in keyof RPCMethods]?: (sdk: ClientSDK, request: RPCMethods[K]['request']) => Promise<RPCMethods[K]['response']>
    }
}

export interface ClientHooks {
    // Dashboard Layout
    'dashboard-header': { payload: { context?: any }; response: any };
    'dashboard-widget': { payload: { context?: any }; response: any };

    // Dashboard Home
    'dashboard-home:before': { payload: { page: string; context?: any }; response: any };
    'dashboard-home:after': { payload: { page: string; context?: any }; response: any };
    'stats-section:before': { payload: { page: string; data?: any }; response: any };
    'stats-section:after': { payload: { page: string; data?: any }; response: any };
    'quick-draft:before': { payload: { page: string; context?: any }; response: any };
    'quick-draft:after': { payload: { page: string; context?: any }; response: any };

    // Blog Pages
    'blogs-list:before': { payload: { page: string; data?: any }; response: any };
    'blogs-list:after': { payload: { page: string; data?: any }; response: any };
    'blogs-list-toolbar': { payload: { context?: any }; response: any };
    'blog-table:before': { payload: { page: string; data?: any }; response: any };
    'blog-table:after': { payload: { page: string; data?: any }; response: any };
    'blog-item:before': { payload: { context: { blog: any } }; response: any };
    'blog-item:after': { payload: { context: { blog: any } }; response: any };
    'blog-create-form:before': { payload: { page: string; entity: string; data?: any }; response: any };
    'blog-create-form:after': { payload: { page: string; entity: string; data?: any }; response: any };
    'blog-update-form:before': { payload: { page: string; entity: string; data?: any }; response: any };
    'blog-update-form:after': { payload: { page: string; entity: string; data?: any }; response: any };
    'editor-sidebar-widget': { payload: { context?: any }; response: any };

    // User Pages
    'users-list:before': { payload: { page: string; data?: any }; response: any };
    'users-list:after': { payload: { page: string; data?: any }; response: any };
    'users-list-toolbar': { payload: { context?: any }; response: any };
    'user-table:before': { payload: { page: string; data?: any }; response: any };
    'user-table:after': { payload: { page: string; data?: any }; response: any };
    'user-item:before': { payload: { context: { user: any } }; response: any };
    'user-item:after': { payload: { context: { user: any } }; response: any };
    'user-create:before': { payload: { page: string; entity: string }; response: any };
    'user-create:after': { payload: { page: string; entity: string }; response: any };
    'user-create-form:before': { payload: { page: string; entity: string; data?: any }; response: any };
    'user-create-form:after': { payload: { page: string; entity: string; data?: any }; response: any };
    'user-create-form:toolbar': { payload: { context?: any }; response: any };
    'user-update:before': { payload: { page: string; entity: string; data?: any }; response: any };
    'user-update:after': { payload: { page: string; entity: string; data?: any }; response: any };
    'user-update-form:before': { payload: { page: string; entity: string; data?: any }; response: any };
    'user-update-form:after': { payload: { page: string; entity: string; data?: any }; response: any };
    'user-update-form:toolbar': { payload: { context?: any }; response: any };

    // Tag Pages
    'tags-list:before': { payload: { page: string; data?: any }; response: any };
    'tags-list:after': { payload: { page: string; data?: any }; response: any };
    'tags-list-toolbar': { payload: { context?: any }; response: any };
    'tags-table:before': { payload: { page: string; data?: any }; response: any };
    'tags-table:after': { payload: { page: string; data?: any }; response: any };
    'tag-item:before': { payload: { context: { tag: any } }; response: any };
    'tag-item:after': { payload: { context: { tag: any } }; response: any };
    'tag-create:before': { payload: { page: string; entity: string }; response: any };
    'tag-create:after': { payload: { page: string; entity: string }; response: any };
    'tag-create-form:before': { payload: { page: string; entity: string; data?: any }; response: any };
    'tag-create-form:after': { payload: { page: string; entity: string; data?: any }; response: any };
    'tag-create-form:toolbar': { payload: { context?: any }; response: any };
    'tag-update:before': { payload: { page: string; entity: string; data?: any }; response: any };
    'tag-update:after': { payload: { page: string; entity: string; data?: any }; response: any };
    'tag-update-form:before': { payload: { page: string; entity: string; data?: any }; response: any };
    'tag-update-form:after': { payload: { page: string; entity: string; data?: any }; response: any };
    'tag-update-form:toolbar': { payload: { context?: any }; response: any };

    // Category Pages
    'categories-list:before': { payload: { page: string; data?: any }; response: any };
    'categories-list:after': { payload: { page: string; data?: any }; response: any };
    'categories-list-toolbar': { payload: { context?: any }; response: any };
    'categories-table:before': { payload: { page: string; data?: any }; response: any };
    'categories-table:after': { payload: { page: string; data?: any }; response: any };
    'category-item:before': { payload: { context: { category: any } }; response: any };
    'category-item:after': { payload: { context: { category: any } }; response: any };
    'category-create:before': { payload: { page: string; entity: string }; response: any };
    'category-create:after': { payload: { page: string; entity: string }; response: any };
    'category-create-form:before': { payload: { page: string; entity: string; data?: any }; response: any };
    'category-create-form:after': { payload: { page: string; entity: string; data?: any }; response: any };
    'category-create-form:toolbar': { payload: { context?: any }; response: any };
    'category-update:before': { payload: { page: string; entity: string; data?: any }; response: any };
    'category-update:after': { payload: { page: string; entity: string; data?: any }; response: any };
    'category-update-form:before': { payload: { page: string; entity: string; data?: any }; response: any };
    'category-update-form:after': { payload: { page: string; entity: string; data?: any }; response: any };
    'category-update-form:toolbar': { payload: { context?: any }; response: any };

    // Settings Pages
    'settings-list:before': { payload: { page: string; data?: any }; response: any };
    'settings-list:after': { payload: { page: string; data?: any }; response: any };
    'settings-list-toolbar': { payload: { context?: any }; response: any };
    'settings-table:before': { payload: { page: string; data?: any }; response: any };
    'settings-table:after': { payload: { page: string; data?: any }; response: any };
    'setting-item:before': { payload: { context: { setting: any } }; response: any };
    'setting-item:after': { payload: { context: { setting: any } }; response: any };
    'setting-create:before': { payload: { page: string; entity: string }; response: any };
    'setting-create:after': { payload: { page: string; entity: string }; response: any };
    'setting-create-form:before': { payload: { page: string; entity: string; data?: any }; response: any };
    'setting-create-form:after': { payload: { page: string; entity: string; data?: any }; response: any };
    'setting-create-form:toolbar': { payload: { context?: any }; response: any };
    'setting-update:before': { payload: { page: string; entity: string; data?: any }; response: any };
    'setting-update:after': { payload: { page: string; entity: string; data?: any }; response: any };
    'setting-update-form:before': { payload: { page: string; entity: string; data?: any }; response: any };
    'setting-update-form:after': { payload: { page: string; entity: string; data?: any }; response: any };
    'setting-update-form:toolbar': { payload: { context?: any }; response: any };

    // Plugin Pages
    'plugins-list:before': { payload: { page: string; data?: any }; response: any };
    'plugins-list:after': { payload: { page: string; data?: any }; response: any };
    'plugins-list-toolbar': { payload: { context?: any }; response: any };
    'plugins-table:before': { payload: { page: string; data?: any }; response: any };
    'plugins-table:after': { payload: { page: string; data?: any }; response: any };
    'plugin-item:before': { payload: { context: { plugin: any } }; response: any };
    'plugin-item:after': { payload: { context: { plugin: any } }; response: any };

    // Plugin system hooks
    'system:plugin:settings-panel': { payload: { context?: any }; response: any };
}

export type HookPosition =
    | 'header'
    | 'footer'
    | 'sidebar'
    | 'toolbar'
    | 'content'
    | 'widget'
    | 'modal'
    | 'panel'
    | string;

export type DashboardPage = 'blogs' | 'users' | 'tags' | 'categories' | 'plugins' | 'settings' | 'dashboard' | string;

export interface ClientHookPattern {
    page?: DashboardPage;
    entity?: string;
    position?: HookPosition;
}

export type ClientHooksDefinition = {
    [hookName: string]: (
        sdk: ClientSDK,
        prev?: any,
        context?: Record<string, any>
    ) => JSXElement | null;
};
