import type {
    Blog,
    BlogStatus,
    Category,
    Permission,
    Plugin,
    PluginHookMapping,
    SettingsEntry,
    Tag,
    User
} from './database/entities';
import {UIConfiguration} from "./configuration";

// Standard API response format
export interface APIResponse<T = any> {
    authenticated?: boolean;
    code: number;
    message: string;
    payload?: T;
}

export interface BlogAPI {
    getBlogs(): Promise<APIResponse<Blog[]>>;
    getBlog(id: string): Promise<APIResponse<Blog>>;
    createBlog(data: {
        title: string;
        slug: string;
        content: string;
        status: BlogStatus;
        category: string;
        tags: string[];
        excerpt?: string;
        featuredImage?: string;
        metadata?: Record<string, any>;
    }): Promise<APIResponse<Blog>>;

    updateBlog(id: string, data: {
        title?: string;
        slug?: string;
        content?: string;
        excerpt?: string;
        category?: string;
        tags?: string[];
        status?: BlogStatus;
        featuredImage?: string;
    }): Promise<APIResponse<Blog>>;

    updateBlogMetadata(id: string, metadata: Record<string, any>): Promise<APIResponse<Blog>>;
    deleteBlog(id: string): Promise<APIResponse<null>>;
}

export interface UserAPI {
    getUsers(): Promise<APIResponse<User[]>>;
    getUser(id: string): Promise<APIResponse<User>>;
    getCurrentUser(): Promise<APIResponse<User>>;
    createUser(data: {
        username: string;
        email: string;
        password: string;
        name: string;
        slug: string;
        bio: string;
        permissions?: Permission[];
    }): Promise<APIResponse<User>>;

    updateUser(id: string, data: {
        username?: string;
        email?: string;
        password?: string;
        name?: string;
        slug?: string;
        bio?: string;
        permissions?: Permission[];
    }): Promise<APIResponse<User>>;

    deleteUser(id: string): Promise<APIResponse<null>>;
}

export interface CategoryAPI {
    getCategories(): Promise<APIResponse<Category[]>>;
    getCategory(id: string): Promise<APIResponse<Category>>;
    createCategory(data: {
        name: string;
        description: string;
        slug: string;
    }): Promise<APIResponse<Category>>;

    updateCategory(id: string, data: {
        name?: string;
        description?: string;
        slug?: string;
    }): Promise<APIResponse<Category>>;

    deleteCategory(id: string): Promise<APIResponse<null>>;
}

export interface TagAPI {
    getTags(): Promise<APIResponse<Tag[]>>;
    getTag(id: string): Promise<APIResponse<Tag>>;

    createTag(data: {
        name: string;
        slug: string;
    }): Promise<APIResponse<Tag>>;
    updateTag(id: string, data: {
        name?: string;
        slug?: string;
    }): Promise<APIResponse<Tag>>;

    deleteTag(id: string): Promise<APIResponse<null>>;
}

export interface SettingsAPI {
    getSettings(): Promise<APIResponse<SettingsEntry[]>>;
    getSetting(id: string): Promise<APIResponse<SettingsEntry>>;

    createSetting(data: {
        key: string;
        value: string | boolean | number | boolean[] | string[] | number[];
        scope?: 'global' | 'user';
    }): Promise<APIResponse<SettingsEntry>>;
    updateSetting(id: string, data: {
        key?: string;
        value?: string | boolean | number | boolean[] | string[] | number[];
    }): Promise<APIResponse<SettingsEntry>>;

    deleteSetting(id: string): Promise<APIResponse<null>>;
}

export interface PluginAPI {
    getPlugins(): Promise<APIResponse<Plugin[]>>;
    getPlugin(id: string): Promise<APIResponse<Plugin>>;

    createPlugin(data: {
        url: string;
    }): Promise<APIResponse<Plugin>>;
    updatePlugin(id: string, data: {
        name?: string;
        description?: string;
        version?: string;
        url?: string;
        author?: string;
    }): Promise<APIResponse<Plugin>>;

    deletePlugin(id: string): Promise<APIResponse<null>>;
    reinstallPlugin(id: string): Promise<APIResponse<{ clearCache: boolean }>>;
    getPluginHookMappings(params?: {
        type: 'client' | 'server' | 'rpc'
    }): Promise<APIResponse<PluginHookMapping[]>>;
    callPluginHook<TPayload = any, TResponse = any>(
        hookName: string,
        payload: TPayload
    ): Promise<TResponse>;
}

export interface AuthAPI {
    login(username: string, password: string): Promise<APIResponse<User>>;
    logout(): Promise<APIResponse<null>>;
    checkPermission(permission: Permission): Promise<APIResponse<boolean>>;
    getAllPermissions(): Promise<APIResponse<Permission[]>>;
}

export interface ConfigAPI {
    getConfig(): Promise<APIResponse<UIConfiguration>>;
}

// Combined API Client interface
export interface APIClient extends BlogAPI,
    UserAPI,
    CategoryAPI,
    TagAPI,
    SettingsAPI,
    PluginAPI,
    AuthAPI,
    ConfigAPI {
    // Token management for the client
    setToken?(token: string): void;

    clearToken?(): void;
}