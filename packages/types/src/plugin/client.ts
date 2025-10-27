import {RPCMethods} from "./common";
import type {ClientHooksDefinition, ClientRPCsDefinition} from './types';
import type {Blog, Category, Permission, SettingsEntry, Tag, User} from '../database/entities';

export type * from './common';

export interface ClientPluginModule {
    hasSettingsPanel?: boolean;
    hooks?: ClientHooksDefinition<ClientHooks>,
    rpcs?: ClientRPCsDefinition<RPCMethods>
}

// Generic context type with common properties
export interface ClientHookContext {
}

// Common form interface for all editor contexts
interface EditorFormBase<T> {
    data: Partial<T>;
    on: (event: string, callback: Function) => void;
    off: (event: string, callback: Function) => void;
}

// Specific context for editor pages
export interface BlogEditorContext extends ClientHookContext {
    blogId: string;
    contentOwnerId?: string;
    form: EditorFormBase<Blog> & {
        getCategory: () => Category | undefined;
        getTags: () => Tag[] | undefined;
    };
    data: Blog;
}

export interface CategoryEditorContext extends ClientHookContext {
    categoryId: string;
    form: EditorFormBase<Category>;
    data: Category
}

export interface TagEditorContext extends ClientHookContext {
    tagId: string;
    form: EditorFormBase<Tag>;
    data: Tag
}

export interface UserEditorContext extends ClientHookContext {
    userId: string;
    form: EditorFormBase<User> & {
        availablePermissions: Permission[];
    };
    data: User
}

export interface SettingEditorContext extends ClientHookContext {
    settingId: string;
    form: EditorFormBase<SettingsEntry>;
    data: SettingsEntry;
}

// Context for list views
export interface BlogListItemContext extends ClientHookContext {
    blog: Blog;
}

export interface UserListItemContext extends ClientHookContext {
    user: User;
}

export interface TagListItemContext extends ClientHookContext {
    tag: Tag;
}

export interface CategoryListItemContext extends ClientHookContext {
    category: Category;
}

export interface ClientHooks extends Record<string, { payload?: any; response: any }> {
    // Dashboard Layout
    'dashboard-header': { payload: { context?: ClientHookContext }; response: any };
    'dashboard-widget': { payload: { context?: ClientHookContext }; response: any };

    // Dashboard Home
    'dashboard-home:before': { payload: { context: ClientHookContext }; response: any };
    'dashboard-home:after': { payload: { context: ClientHookContext }; response: any };
    'stats-section:before': { payload: { context: ClientHookContext }; response: any };
    'stats-section:after': { payload: { context: ClientHookContext }; response: any };

    // Blog Pages
    'blogs-list:before': { payload: { context: ClientHookContext }; response: any };
    'blogs-list:after': { payload: { context: ClientHookContext }; response: any };
    'blogs-list-toolbar': { payload: { context?: ClientHookContext }; response: any };
    'blogs-table:before': { payload: { context: ClientHookContext }; response: any };
    'blogs-table:after': { payload: { context: ClientHookContext }; response: any };
    'blog-item:before': { payload: { context: BlogListItemContext }; response: any };
    'blog-item:after': { payload: { context: BlogListItemContext }; response: any };
    'blog-create:before': { payload: { context: ClientHookContext }; response: any };
    'blog-create:after': { payload: { context: ClientHookContext }; response: any };
    'blog-create-form:before': { payload: { context: ClientHookContext }; response: any };
    'blog-create-form:after': { payload: { context: ClientHookContext }; response: any };
    'blog-create-form:toolbar': { payload: { context?: ClientHookContext }; response: any };
    'blog-update-form:before': { payload: { context: BlogEditorContext }; response: any };
    'blog-update-form:after': { payload: { context: BlogEditorContext }; response: any };
    'blog-update-before': { payload: { context: BlogEditorContext }; response: any };
    'blog-update-after': { payload: { context: BlogEditorContext }; response: any };
    'editor-sidebar-widget': { payload: { context: BlogEditorContext }; response: any };
    'blog-sidebar-widget': { payload: { context: BlogEditorContext }; response: any };

    // User Pages
    'users-list:before': { payload: { context: ClientHookContext }; response: any };
    'users-list:after': { payload: { context: ClientHookContext }; response: any };
    'users-list-toolbar': { payload: { context?: ClientHookContext }; response: any };
    'users-table:before': { payload: { context: ClientHookContext }; response: any };
    'users-table:after': { payload: { context: ClientHookContext }; response: any };
    'user-item:before': { payload: { context: UserListItemContext }; response: any };
    'user-item:after': { payload: { context: UserListItemContext }; response: any };
    'user-create:before': { payload: { context: ClientHookContext }; response: any };
    'user-create:after': { payload: { context: ClientHookContext }; response: any };
    'user-create-form:before': { payload: { context: ClientHookContext }; response: any };
    'user-create-form:after': { payload: { context: ClientHookContext }; response: any };
    'user-create-form:toolbar': { payload: { context?: ClientHookContext }; response: any };
    'user-update-form:before': { payload: { context: UserEditorContext }; response: any };
    'user-update-form:after': { payload: { context: UserEditorContext }; response: any };
    'user-update-form:toolbar': { payload: { context?: ClientHookContext }; response: any };
    'user-update-before': { payload: { context: UserEditorContext }; response: any };
    'user-update-after': { payload: { context: UserEditorContext }; response: any };
    'user-sidebar-widget': { payload: { context: UserEditorContext }; response: any };

    // Tag Pages
    'tags-list:before': { payload: { context: ClientHookContext }; response: any };
    'tags-list:after': { payload: { context: ClientHookContext }; response: any };
    'tags-list-toolbar': { payload: { context?: ClientHookContext }; response: any };
    'tags-table:before': { payload: { context: ClientHookContext }; response: any };
    'tags-table:after': { payload: { context: ClientHookContext }; response: any };
    'tag-item:before': { payload: { context: TagListItemContext }; response: any };
    'tag-item:after': { payload: { context: TagListItemContext }; response: any };
    'tag-create:before': { payload: { context: ClientHookContext }; response: any };
    'tag-create:after': { payload: { context: ClientHookContext }; response: any };
    'tag-create-form:before': { payload: { context: ClientHookContext }; response: any };
    'tag-create-form:after': { payload: { context: ClientHookContext }; response: any };
    'tag-create-form:toolbar': { payload: { context?: ClientHookContext }; response: any };
    'tag-update-form:before': { payload: { context: TagEditorContext }; response: any };
    'tag-update-form:after': { payload: { context: TagEditorContext }; response: any };
    'tag-update-form:toolbar': { payload: { context?: ClientHookContext }; response: any };
    'tag-update-before': { payload: { context: TagEditorContext }; response: any };
    'tag-update-after': { payload: { context: TagEditorContext }; response: any };
    'tag-sidebar-widget': { payload: { context: TagEditorContext }; response: any };

    // Category Pages
    'categories-list:before': { payload: { context: ClientHookContext }; response: any };
    'categories-list:after': { payload: { context: ClientHookContext }; response: any };
    'categories-list-toolbar': { payload: { context?: ClientHookContext }; response: any };
    'categories-table:before': { payload: { context: ClientHookContext }; response: any };
    'categories-table:after': { payload: { context: ClientHookContext }; response: any };
    'category-item:before': { payload: { context: CategoryListItemContext }; response: any };
    'category-item:after': { payload: { context: CategoryListItemContext }; response: any };
    'category-create:before': { payload: { context: ClientHookContext }; response: any };
    'category-create:after': { payload: { context: ClientHookContext }; response: any };
    'category-create-form:before': { payload: { context: ClientHookContext }; response: any };
    'category-create-form:after': { payload: { context: ClientHookContext }; response: any };
    'category-create-form:toolbar': { payload: { context?: ClientHookContext }; response: any };
    'category-update-form:before': { payload: { context: CategoryEditorContext }; response: any };
    'category-update-form:after': { payload: { context: CategoryEditorContext }; response: any };
    'category-update-form:toolbar': { payload: { context?: ClientHookContext }; response: any };
    'category-update-before': { payload: { context: CategoryEditorContext }; response: any };
    'category-update-after': { payload: { context: CategoryEditorContext }; response: any };
    'category-sidebar-widget': { payload: { context: CategoryEditorContext }; response: any };

    // Settings Pages
    'settings-list:before': { payload: { context: ClientHookContext }; response: any };
    'settings-list:after': { payload: { context: ClientHookContext }; response: any };
    'settings-list-toolbar': { payload: { context?: ClientHookContext }; response: any };
    'settings-table:before': { payload: { context: ClientHookContext }; response: any };
    'settings-table:after': { payload: { context: ClientHookContext }; response: any };
    'setting-item:before': { payload: { context: ClientHookContext }; response: any };
    'setting-item:after': { payload: { context: ClientHookContext }; response: any };
    'setting-create:before': { payload: { context: ClientHookContext }; response: any };
    'setting-create:after': { payload: { context: ClientHookContext }; response: any };
    'setting-create-form:before': { payload: { context: ClientHookContext }; response: any };
    'setting-create-form:after': { payload: { context: ClientHookContext }; response: any };
    'setting-create-form:toolbar': { payload: { context?: ClientHookContext }; response: any };
    'setting-update-form:before': { payload: { context: SettingEditorContext }; response: any };
    'setting-update-form:after': { payload: { context: SettingEditorContext }; response: any };
    'setting-update-form:toolbar': { payload: { context?: ClientHookContext }; response: any };
    'setting-update-before': { payload: { context: SettingEditorContext }; response: any };
    'setting-update-after': { payload: { context: SettingEditorContext }; response: any };
    'setting-sidebar-widget': { payload: { context: SettingEditorContext }; response: any };

    // Plugin Pages
    'plugins-list:before': { payload: { context: ClientHookContext }; response: any };
    'plugins-list:after': { payload: { context: ClientHookContext }; response: any };
    'plugins-list-toolbar': { payload: { context?: ClientHookContext }; response: any };
    'plugins-table:before': { payload: { context: ClientHookContext }; response: any };
    'plugins-table:after': { payload: { context: ClientHookContext }; response: any };
    'plugin-item:before': { payload: { context: ClientHookContext }; response: any };
    'plugin-item:after': { payload: { context: ClientHookContext }; response: any };

    // Plugin system hooks
    'system:plugin:settings-panel': { payload: { context?: ClientHookContext }; response: any };
}
