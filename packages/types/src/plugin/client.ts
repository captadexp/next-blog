import type {RPCMethods} from './common';
import type {ClientHooksDefinition, ClientRPCsDefinition} from './types';
import type {Blog, Category, Tag, User} from '../database/entities';

export interface ClientPluginModule {
    hasSettingsPanel?: boolean;
    hooks?: ClientHooksDefinition<ClientHooks>,
    rpcs?: ClientRPCsDefinition<RPCMethods>
}

// Generic context type with common properties
export interface ClientHookContext<T = any> {
    zone?: string;
    page?: string;
    entity?: string;
    data?: T;
    actions?: Record<string, Function>;
}

// Specific context for blog editor pages
export interface BlogEditorContext extends ClientHookContext<Blog> {
    page: 'blogs';
    entity: 'blog';
    data: Blog;
    blogId: string;
    contentOwnerId?: string;
    editor: {
        getTitle: () => string;
        getContent: () => string;
    };
    on: (event: string, callback: Function) => void;
}

// Context for list views
export interface BlogListContext extends ClientHookContext<Blog> {
    blog: Blog;
}

export interface UserListContext extends ClientHookContext<User> {
    user: User;
}

export interface TagListContext extends ClientHookContext<Tag> {
    tag: Tag;
}

export interface CategoryListContext extends ClientHookContext<Category> {
    category: Category;
}

export interface ClientHooks extends Record<string, { payload?: any; response: any }> {
    // Dashboard Layout
    'dashboard-header': { payload: { context?: ClientHookContext }; response: any };
    'dashboard-widget': { payload: { context?: ClientHookContext }; response: any };

    // Dashboard Home
    'dashboard-home:before': { payload: { context: ClientHookContext & { page: 'dashboard' } }; response: any };
    'dashboard-home:after': { payload: { context: ClientHookContext & { page: 'dashboard' } }; response: any };
    'stats-section:before': { payload: { context: ClientHookContext }; response: any };
    'stats-section:after': { payload: { context: ClientHookContext }; response: any };
    'quick-draft:before': { payload: { context: ClientHookContext }; response: any };
    'quick-draft:after': { payload: { context: ClientHookContext }; response: any };

    // Blog Pages
    'blogs-list:before': { payload: { context: ClientHookContext<Blog[]> & { page: 'blogs' } }; response: any };
    'blogs-list:after': { payload: { context: ClientHookContext<Blog[]> & { page: 'blogs' } }; response: any };
    'blogs-list-toolbar': { payload: { context?: ClientHookContext }; response: any };
    'blog-table:before': { payload: { context: ClientHookContext<Blog[]> & { page: 'blogs' } }; response: any };
    'blog-table:after': { payload: { context: ClientHookContext<Blog[]> & { page: 'blogs' } }; response: any };
    'blog-item:before': { payload: { context: BlogListContext }; response: any };
    'blog-item:after': { payload: { context: BlogListContext }; response: any };
    'blog-create-form:before': {
        payload: { context: ClientHookContext & { page: 'blogs'; entity: 'blog' } };
        response: any
    };
    'blog-create-form:after': {
        payload: { context: ClientHookContext & { page: 'blogs'; entity: 'blog' } };
        response: any
    };
    'blog-update-form:before': { payload: { context: BlogEditorContext }; response: any };
    'blog-update-form:after': { payload: { context: BlogEditorContext }; response: any };
    'editor-sidebar-widget': { payload: { context: BlogEditorContext }; response: any };

    // User Pages
    'users-list:before': { payload: { context: ClientHookContext<User[]> & { page: 'users' } }; response: any };
    'users-list:after': { payload: { context: ClientHookContext<User[]> & { page: 'users' } }; response: any };
    'users-list-toolbar': { payload: { context?: ClientHookContext }; response: any };
    'user-table:before': { payload: { context: ClientHookContext<User[]> & { page: 'users' } }; response: any };
    'user-table:after': { payload: { context: ClientHookContext<User[]> & { page: 'users' } }; response: any };
    'user-item:before': { payload: { context: UserListContext }; response: any };
    'user-item:after': { payload: { context: UserListContext }; response: any };
    'user-create:before': {
        payload: { context: ClientHookContext & { page: 'users'; entity: 'user' } };
        response: any
    };
    'user-create:after': { payload: { context: ClientHookContext & { page: 'users'; entity: 'user' } }; response: any };
    'user-create-form:before': {
        payload: { context: ClientHookContext & { page: 'users'; entity: 'user' } };
        response: any
    };
    'user-create-form:after': {
        payload: { context: ClientHookContext & { page: 'users'; entity: 'user' } };
        response: any
    };
    'user-create-form:toolbar': { payload: { context?: ClientHookContext }; response: any };
    'user-update:before': {
        payload: { context: ClientHookContext<User> & { page: 'users'; entity: 'user' } };
        response: any
    };
    'user-update:after': {
        payload: { context: ClientHookContext<User> & { page: 'users'; entity: 'user' } };
        response: any
    };
    'user-update-form:before': {
        payload: { context: ClientHookContext<User> & { page: 'users'; entity: 'user' } };
        response: any
    };
    'user-update-form:after': {
        payload: { context: ClientHookContext<User> & { page: 'users'; entity: 'user' } };
        response: any
    };
    'user-update-form:toolbar': { payload: { context?: ClientHookContext }; response: any };

    // Tag Pages
    'tags-list:before': { payload: { context: ClientHookContext<Tag[]> & { page: 'tags' } }; response: any };
    'tags-list:after': { payload: { context: ClientHookContext<Tag[]> & { page: 'tags' } }; response: any };
    'tags-list-toolbar': { payload: { context?: ClientHookContext }; response: any };
    'tags-table:before': { payload: { context: ClientHookContext<Tag[]> & { page: 'tags' } }; response: any };
    'tags-table:after': { payload: { context: ClientHookContext<Tag[]> & { page: 'tags' } }; response: any };
    'tag-item:before': { payload: { context: TagListContext }; response: any };
    'tag-item:after': { payload: { context: TagListContext }; response: any };
    'tag-create:before': { payload: { context: ClientHookContext & { page: 'tags'; entity: 'tag' } }; response: any };
    'tag-create:after': { payload: { context: ClientHookContext & { page: 'tags'; entity: 'tag' } }; response: any };
    'tag-create-form:before': {
        payload: { context: ClientHookContext & { page: 'tags'; entity: 'tag' } };
        response: any
    };
    'tag-create-form:after': {
        payload: { context: ClientHookContext & { page: 'tags'; entity: 'tag' } };
        response: any
    };
    'tag-create-form:toolbar': { payload: { context?: ClientHookContext }; response: any };
    'tag-update:before': {
        payload: { context: ClientHookContext<Tag> & { page: 'tags'; entity: 'tag' } };
        response: any
    };
    'tag-update:after': {
        payload: { context: ClientHookContext<Tag> & { page: 'tags'; entity: 'tag' } };
        response: any
    };
    'tag-update-form:before': {
        payload: { context: ClientHookContext<Tag> & { page: 'tags'; entity: 'tag' } };
        response: any
    };
    'tag-update-form:after': {
        payload: { context: ClientHookContext<Tag> & { page: 'tags'; entity: 'tag' } };
        response: any
    };
    'tag-update-form:toolbar': { payload: { context?: ClientHookContext }; response: any };

    // Category Pages
    'categories-list:before': {
        payload: { context: ClientHookContext<Category[]> & { page: 'categories' } };
        response: any
    };
    'categories-list:after': {
        payload: { context: ClientHookContext<Category[]> & { page: 'categories' } };
        response: any
    };
    'categories-list-toolbar': { payload: { context?: ClientHookContext }; response: any };
    'categories-table:before': {
        payload: { context: ClientHookContext<Category[]> & { page: 'categories' } };
        response: any
    };
    'categories-table:after': {
        payload: { context: ClientHookContext<Category[]> & { page: 'categories' } };
        response: any
    };
    'category-item:before': { payload: { context: CategoryListContext }; response: any };
    'category-item:after': { payload: { context: CategoryListContext }; response: any };
    'category-create:before': {
        payload: { context: ClientHookContext & { page: 'categories'; entity: 'category' } };
        response: any
    };
    'category-create:after': {
        payload: { context: ClientHookContext & { page: 'categories'; entity: 'category' } };
        response: any
    };
    'category-create-form:before': {
        payload: { context: ClientHookContext & { page: 'categories'; entity: 'category' } };
        response: any
    };
    'category-create-form:after': {
        payload: { context: ClientHookContext & { page: 'categories'; entity: 'category' } };
        response: any
    };
    'category-create-form:toolbar': { payload: { context?: ClientHookContext }; response: any };
    'category-update:before': {
        payload: { context: ClientHookContext<Category> & { page: 'categories'; entity: 'category' } };
        response: any
    };
    'category-update:after': {
        payload: { context: ClientHookContext<Category> & { page: 'categories'; entity: 'category' } };
        response: any
    };
    'category-update-form:before': {
        payload: { context: ClientHookContext<Category> & { page: 'categories'; entity: 'category' } };
        response: any
    };
    'category-update-form:after': {
        payload: { context: ClientHookContext<Category> & { page: 'categories'; entity: 'category' } };
        response: any
    };
    'category-update-form:toolbar': { payload: { context?: ClientHookContext }; response: any };

    // Settings Pages
    'settings-list:before': { payload: { context: ClientHookContext<any[]> & { page: 'settings' } }; response: any };
    'settings-list:after': { payload: { context: ClientHookContext<any[]> & { page: 'settings' } }; response: any };
    'settings-list-toolbar': { payload: { context?: ClientHookContext }; response: any };
    'settings-table:before': { payload: { context: ClientHookContext<any[]> & { page: 'settings' } }; response: any };
    'settings-table:after': { payload: { context: ClientHookContext<any[]> & { page: 'settings' } }; response: any };
    'setting-item:before': { payload: { context: ClientHookContext<any> & { setting: any } }; response: any };
    'setting-item:after': { payload: { context: ClientHookContext<any> & { setting: any } }; response: any };
    'setting-create:before': {
        payload: { context: ClientHookContext & { page: 'settings'; entity: 'setting' } };
        response: any
    };
    'setting-create:after': {
        payload: { context: ClientHookContext & { page: 'settings'; entity: 'setting' } };
        response: any
    };
    'setting-create-form:before': {
        payload: { context: ClientHookContext & { page: 'settings'; entity: 'setting' } };
        response: any
    };
    'setting-create-form:after': {
        payload: { context: ClientHookContext & { page: 'settings'; entity: 'setting' } };
        response: any
    };
    'setting-create-form:toolbar': { payload: { context?: ClientHookContext }; response: any };
    'setting-update:before': {
        payload: { context: ClientHookContext<any> & { page: 'settings'; entity: 'setting' } };
        response: any
    };
    'setting-update:after': {
        payload: { context: ClientHookContext<any> & { page: 'settings'; entity: 'setting' } };
        response: any
    };
    'setting-update-form:before': {
        payload: { context: ClientHookContext<any> & { page: 'settings'; entity: 'setting' } };
        response: any
    };
    'setting-update-form:after': {
        payload: { context: ClientHookContext<any> & { page: 'settings'; entity: 'setting' } };
        response: any
    };
    'setting-update-form:toolbar': { payload: { context?: ClientHookContext }; response: any };

    // Plugin Pages
    'plugins-list:before': { payload: { context: ClientHookContext<any[]> & { page: 'plugins' } }; response: any };
    'plugins-list:after': { payload: { context: ClientHookContext<any[]> & { page: 'plugins' } }; response: any };
    'plugins-list-toolbar': { payload: { context?: ClientHookContext }; response: any };
    'plugins-table:before': { payload: { context: ClientHookContext<any[]> & { page: 'plugins' } }; response: any };
    'plugins-table:after': { payload: { context: ClientHookContext<any[]> & { page: 'plugins' } }; response: any };
    'plugin-item:before': { payload: { context: ClientHookContext<any> & { plugin: any } }; response: any };
    'plugin-item:after': { payload: { context: ClientHookContext<any> & { plugin: any } }; response: any };

    // Plugin system hooks
    'system:plugin:settings-panel': { payload: { context?: ClientHookContext }; response: any };
}
