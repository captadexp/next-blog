import type {ClientSDK, JSXElement} from '../sdk/client';

export interface ClientPluginModule {
    hooks: ClientHooksDefinition,
    hasSettingsPanel?: boolean;
}

export interface ClientHooks {
    'dashboard:beforeRender': { payload: { page: string; context?: any }; response: any };
    'dashboard:afterRender': { payload: { page: string; context?: any }; response: void };
    'blog:beforeEdit': { payload: { blogId: string; editor?: any }; response: void };
    'blog:afterEdit': { payload: { blogId: string; content?: string }; response: void };
    'editor-sidebar-widget': { payload: { blogId?: string; context?: any }; response: any };
    'dashboard-blogs-header': { payload: { page: string; position: string; context?: any }; response: any };
    'dashboard-blogs-footer': { payload: { page: string; position: string; context?: any }; response: any };
    'dashboard-blogs-sidebar': { payload: { page: string; position: string; context?: any }; response: any };
    'dashboard-users-header': { payload: { page: string; position: string; context?: any }; response: any };
    'dashboard-users-footer': { payload: { page: string; position: string; context?: any }; response: any };
    'dashboard-users-sidebar': { payload: { page: string; position: string; context?: any }; response: any };
    'dashboard-settings-header': { payload: { page: string; position: string; context?: any }; response: any };
    'dashboard-settings-footer': { payload: { page: string; position: string; context?: any }; response: any };
    'dashboard-plugins-header': { payload: { page: string; position: string; context?: any }; response: any };
    'dashboard-plugins-footer': { payload: { page: string; position: string; context?: any }; response: any };
    'editor-blog-toolbar': { payload: { entity: string; position: string; context?: any }; response: any };
    'editor-blog-sidebar': { payload: { entity: string; position: string; context?: any }; response: any };
    'editor-blog-footer': { payload: { entity: string; position: string; context?: any }; response: any };
    'editor-page-toolbar': { payload: { entity: string; position: string; context?: any }; response: any };
    'editor-page-sidebar': { payload: { entity: string; position: string; context?: any }; response: any };
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
