export type BlogStatus = 'draft' | 'pending' | 'private' | 'published' | 'trash';

export interface Blog {
    _id: string;
    title: string;
    slug: string;
    content: string;
    category: string;
    tags: string[];
    userId: string;
    createdAt: number;
    updatedAt: number;
    metadata?: Record<string, any>;
    type?: 'post' | 'page' | string;
    status?: BlogStatus;
    featuredImage?: string;
    excerpt?: string;
    parent?: string;
}

export interface BlogData extends Partial<Blog> {
    title: string;
    slug: string;
    content: string;
    category: string;
    tags: string[];
    userId: string;
}

export interface DetailedBlog extends Omit<Blog, 'category' | 'tags' | 'userId'> {
    author: User;
    category: Category;
    tags: Tag[];
}

export interface Category {
    _id: string;
    name: string;
    description: string;
    slug: string;
    createdAt: number;
    updatedAt: number;
}

export interface CategoryData extends Partial<Category> {
    name: string;
    description: string;
    slug: string;
}

export interface Tag {
    _id: string;
    name: string;
    slug: string;
    createdAt: number;
    updatedAt: number;
}

export interface TagData extends Partial<Tag> {
    name: string;
    slug: string;
}

export interface User {
    _id: string;
    username: string;
    email: string;
    password: string;
    name: string;
    slug: string;
    bio: string;
    permissions: Permission[];
    createdAt: number;
    updatedAt: number;
}

export interface UserData extends Partial<User> {
    username: string;
    email: string;
    password: string;
    name: string;
    slug: string;
    bio: string;
    permissions?: Permission[];
}

export interface SettingsEntry {
    _id: string;
    key: string;
    value: string | boolean | number | boolean[] | string[] | number[];
    owner: string;
    createdAt: number;
    updatedAt: number;
}

export interface SettingsEntryData extends Partial<SettingsEntry> {
    key: string;
    value: string | boolean | number | boolean[] | string[] | number[];
    owner: string;
}

export interface Comment {
    _id: string;
    blogId: string;
    userId?: string;
    authorName?: string;
    authorEmail?: string;
    authorUrl?: string;
    content: string;
    status: 'pending' | 'approved' | 'spam' | 'trash';
    parentCommentId?: string;
    createdAt: number;
    updatedAt: number;
    metadata?: Record<string, any>;
}

export interface CommentData extends Partial<Comment> {
    blogId: string;
    content: string;
}

export interface Revision {
    _id: string;
    blogId: string;
    userId: string;
    title: string;
    content: string;
    createdAt: number;
    metadata?: Record<string, any>;
}

export interface RevisionData extends Partial<Revision> {
    blogId: string;
    userId: string;
    title: string;
    content: string;
}

export interface Media {
    _id: string;
    filename: string;
    url: string;
    mimeType: string;
    altText?: string;
    caption?: string;
    description?: string;
    width?: number;
    height?: number;
    userId: string;
    createdAt: number;
    updatedAt: number;
    metadata?: Record<string, any>;
}

export interface MediaData extends Partial<Media> {
    filename: string;
    url: string;
    mimeType: string;
    userId: string;
}

// Plugin entity stored in database
export interface Plugin {
    _id: string;
    name: string;
    description: string;
    version: string;
    author: string;
    url: string;
    server?: { type: 'url'; url: string; };
    client?: { type: 'url'; url: string; };
    createdAt: number;
    updatedAt: number;
}

export interface PluginData extends Partial<Plugin> {
    url: string;
}

// Plugin hook mapping stored in database
export interface PluginHookMapping {
    _id: string;
    pluginId: string;
    hookName: string;
    type: 'client' | 'server' | 'rpc';
    priority: number;
    createdAt: number;
    updatedAt: number;
}

export interface PluginHookMappingData extends Partial<PluginHookMapping> {
    pluginId: string;
    hookName: string;
    type: 'client' | 'server' | 'rpc';
    priority: number;
}

// Permission system types
export type PermissionType = 'list' | 'read' | 'create' | 'update' | 'delete' | 'all';
export type EntityType = 'all' | 'blogs' | 'categories' | 'tags' | 'users' | 'settings' | 'plugins';
export type Permission = `${EntityType}:${PermissionType}`;

export const PERMISSION_WEIGHTS = {
    action: {
        'list': 10,
        'read': 20,
        'create': 30,
        'update': 40,
        'delete': 50,
        'all': 100
    },
    entity: {
        'blogs': 10,
        'categories': 20,
        'tags': 30,
        'users': 40,
        'settings': 50,
        'plugins': 60,
        'all': 100
    }
} as const;