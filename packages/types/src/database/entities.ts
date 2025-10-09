import {BrandedId, Hydrated} from '../type-base-hydration';

export type BlogStatus = 'draft' | 'pending' | 'private' | 'published' | 'trash';

export interface Blog {
    _id: BrandedId<"Blog">;
    title: string;
    slug: string;
    content: string;
    categoryId: BrandedId<"Category">;
    tagIds: BrandedId<"Tag">[];
    userId: BrandedId<"User">;
    createdAt: number;
    updatedAt: number;
    metadata?: Record<string, any>;
    type?: 'post' | 'page' | string;
    status?: BlogStatus;
    featuredMediaId?: BrandedId<"Media">;
    excerpt?: string;
    parentId?: BrandedId<"Blog">;
}

export interface BlogData extends Partial<Blog> {
    title: string;
    slug: string;
    content: string;
    categoryId: BrandedId<"Category">;
    tagIds: BrandedId<"Tag">[];
    userId: BrandedId<"User">;
}

// Model map for type-safe hydration
export interface ModelMap {
    Blog: Blog;
    User: User;
    Category: Category;
    Tag: Tag;
    Media: Media;
    Comment: Comment;
    Revision: Revision;
    Plugin: Plugin;
    PluginHookMapping: PluginHookMapping;
    SettingsEntry: SettingsEntry;
}

// Automatically hydrated types
export type HydratedBlog = Hydrated<Blog, ModelMap>;
// Automatically infers: user, category, tags[], featuredMedia?, parent?

export type HydratedComment = Hydrated<Comment, ModelMap>;
// Automatically infers: blog, user?, parentComment?

export type HydratedMedia = Hydrated<Media, ModelMap>;
// Automatically infers: user

export type HydratedRevision = Hydrated<Revision, ModelMap>;
// Automatically infers: blog, user

export type HydratedCategory = Hydrated<Category, ModelMap>;
// Automatically infers: parent?

export type HydratedSettingsEntry = Hydrated<SettingsEntry, ModelMap>;
// Automatically infers: owner

// Legacy aliases for backward compatibility (will be removed later)
export type DetailedBlog = HydratedBlog;
export type DetailedComment = HydratedComment;
export type DetailedMedia = HydratedMedia;
export type DetailedRevision = HydratedRevision;
export type DetailedCategory = HydratedCategory;

export interface Category {
    _id: BrandedId<"Category">;
    name: string;
    description: string;
    slug: string;
    parentId?: BrandedId<"Category">;
    createdAt: number;
    updatedAt: number;
}

export interface CategoryData extends Partial<Category> {
    name: string;
    description: string;
    slug: string;
}

export interface Tag {
    _id: BrandedId<"Tag">;
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
    _id: BrandedId<"User">;
    username: string;
    email: string;
    password: string;
    name: string;
    slug: string;
    bio: string;
    permissions: Permission[];
    isSystem?: boolean;
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
    _id: BrandedId<"SettingsEntry">;
    key: string;
    value: string | boolean | number | boolean[] | string[] | number[];
    ownerId: BrandedId<"User"> | BrandedId<"Plugin">;
    ownerType: 'user' | 'plugin';
    isSecure?: boolean; // Indicates if this setting contains sensitive data
    masked?: boolean; // Indicates if the value is masked in the response
    createdAt: number;
    updatedAt: number;
}

export interface SettingsEntryData extends Partial<SettingsEntry> {
    key: string;
    value: string | boolean | number | boolean[] | string[] | number[];
    ownerId: BrandedId<"User"> | BrandedId<"Plugin">;
    ownerType: 'user' | 'plugin';
    isSecure?: boolean;
}

export interface Comment {
    _id: BrandedId<"Comment">;
    blogId: BrandedId<"Blog">;
    userId?: BrandedId<"User">;
    authorName?: string;
    authorEmail?: string;
    authorUrl?: string;
    content: string;
    status: 'pending' | 'approved' | 'spam' | 'trash';
    parentCommentId?: BrandedId<"Comment">;
    createdAt: number;
    updatedAt: number;
    metadata?: Record<string, any>;
}

export interface CommentData extends Partial<Comment> {
    blogId: BrandedId<"Blog">;
    content: string;
}

export interface Revision {
    _id: BrandedId<"Revision">;
    blogId: BrandedId<"Blog">;
    userId: BrandedId<"User">;
    title: string;
    content: string;
    createdAt: number;
    metadata?: Record<string, any>;
}

export interface RevisionData extends Partial<Revision> {
    blogId: BrandedId<"Blog">;
    userId: BrandedId<"User">;
    title: string;
    content: string;
}

export interface Media {
    _id: BrandedId<"Media">;
    filename: string;
    url: string;
    mimeType: string;  // 'image/jpeg', 'video/mp4', etc.

    // Required for videos, used as og:image
    thumbnailUrl?: string;  // REQUIRED if mimeType starts with 'video/'

    // Metadata
    altText?: string;
    caption?: string;
    description?: string;
    width?: number;
    height?: number;
    size?: number;

    // Video specific
    duration?: number;  // seconds
    embedUrl?: string;

    // Ownership
    userId: BrandedId<"User">;
    createdAt: number;
    updatedAt: number;
    metadata?: Record<string, any>;
}

export interface MediaData extends Partial<Media> {
    filename: string;
    url: string;
    mimeType: string;
    userId: BrandedId<"User">;
}

// Plugin entity stored in database
export interface Plugin {
    _id: BrandedId<"Plugin">;
    id: string;
    name: string;
    description: string;
    version: string;
    author: string;
    url: string;
    server?: { type: 'url'; url: string; };
    client?: { type: 'url'; url: string; };
    devMode?: boolean;
    isSystem?: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface PluginData extends Partial<Plugin> {
    url: string;
}

// Plugin hook mapping stored in database
export interface PluginHookMapping {
    _id: BrandedId<"PluginHookMapping">;
    pluginId: BrandedId<"Plugin">;
    hookName: string;
    type: 'client' | 'server' | 'rpc';
    priority: number;
    createdAt: number;
    updatedAt: number;
}

export interface PluginHookMappingData extends Partial<PluginHookMapping> {
    pluginId: BrandedId<"Plugin">;
    hookName: string;
    type: 'client' | 'server' | 'rpc';
    priority: number;
}

// Permission system types
export type PermissionType = 'list' | 'read' | 'create' | 'update' | 'delete' | 'all';
export type EntityType = 'all' | 'blogs' | 'categories' | 'tags' | 'users' | 'settings' | 'plugins' | 'media';
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
        'media': 70,
        'all': 100
    }
} as const;