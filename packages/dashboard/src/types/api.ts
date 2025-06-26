export interface StandardResponse<T> {
    authenticated?: boolean;
    code: number;
    message: string;
    payload?: T;
}

export interface UIConfig {
    logo?: string;
    theme?: {
        primaryColor?: string;
        secondaryColor?: string;
        darkMode?: boolean;
    };
    branding?: {
        name?: string;
        description?: string;
    };
    features?: {
        comments?: boolean;
        search?: boolean;
        analytics?: boolean;
    };
    navigation?: {
        menuItems?: {
            label: string;
            path: string;
            icon?: string;
        }[];
    };
}

export interface Blog {
    _id: string;
    title: string;
    slug: string;
    content: string;
    category: string;
    tags: string[];
    userId: string;
    excerpt?: string;
    status: "draft" | "published";
    createdAt: number;
    updatedAt: number;
}

export type PermissionType = 'list' | 'read' | 'create' | 'update' | 'delete' | 'all';
export type EntityType = 'all' | 'blogs' | 'categories' | 'tags' | 'users' | 'settings' | 'plugins';
export type Permission = `${EntityType}:${PermissionType}`;

export interface User {
    _id: string;
    username: string;
    email: string;
    name: string;
    slug: string;
    bio: string;
    permissions: Permission[];
    createdAt: number;
    updatedAt: number;
}

export interface Category {
    _id: string;
    name: string;
    description?: string;
    slug: string;
    createdAt?: number;
    updatedAt?: number;
}

export interface Tag {
    _id: string;
    name: string;
    slug: string;
    createdAt?: number;
    updatedAt?: number;
}

export interface CreateBlogInput {
    title: string;
    slug: string;
    content: string;
    status: "draft" | "published";
    category: string;
    tags: string[];
}

export interface UpdateBlogInput {
    title?: string;
    slug?: string;
    content?: string;
    excerpt?: string;
    category?: string;
    tags?: string[];
}

export interface CreateUserInput {
    username: string;
    email: string;
    password: string;
    name: string;
    slug: string;
    bio: string;
    permissions?: Permission[];
}

export interface UpdateUserInput {
    username?: string;
    email?: string;
    password?: string;
    name?: string;
    slug?: string;
    bio?: string;
    permissions?: Permission[];
}

export interface CreateCategoryInput {
    name: string;
    description?: string;
    slug: string;
}

export interface UpdateCategoryInput {
    name?: string;
    description?: string;
    slug?: string;
}

export interface CreateTagInput {
    name: string;
    slug: string;
}

export interface UpdateTagInput {
    name?: string;
    slug?: string;
}

export interface Settings {
    _id: string;
    key: string;
    value: string | boolean | number | boolean[] | string[] | number[];
    owner: string;
    createdAt: number;
    updatedAt: number;
}

export interface CreateSettingsInput {
    key: string;
    value: string | boolean | number | boolean[] | string[] | number[];
    owner: string;
}

export interface UpdateSettingsInput {
    key?: string;
    value?: string | boolean | number | boolean[] | string[] | number[];
    owner?: string;
}

export type PluginType = 'external' | 'lite' | 'browser';

export interface Plugin {
    _id: string;
    name: string;
    description: string;
    version: string;
    type: PluginType;
    entryPoint: string;
    author: string;
    createdAt: number;
    updatedAt: number;
}

export interface CreatePluginInput {
    name: string;
    description: string;
    version: string;
    type: PluginType;
    entryPoint: string;
    author: string;
}

export interface UpdatePluginInput {
    name?: string;
    description?: string;
    version?: string;
    type?: PluginType;
    entryPoint?: string;
    author?: string;
}

export interface PluginHookMapping {
    _id: string;
    pluginId: string;
    hookName: string;
    priority: number;
    createdAt: number;
    updatedAt: number;
}

export interface CreatePluginHookMappingInput {
    pluginId: string;
    hookName: string;
    priority: number;
}

export interface UpdatePluginHookMappingInput {
    pluginId?: string;
    hookName?: string;
    priority?: number;
}
