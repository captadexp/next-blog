/**
 * Database adapter interfaces
 */

import type {
    Blog,
    BlogData,
    Category,
    CategoryData,
    Comment,
    CommentData,
    DetailedBlog,
    Media,
    MediaData,
    Plugin,
    PluginData,
    PluginHookMapping,
    PluginHookMappingData,
    Revision,
    RevisionData,
    SettingsEntry,
    SettingsEntryData,
    Tag,
    TagData,
    User,
    UserData
} from './entities';

// Generic filter type for database queries
export type Filter<T> = Partial<Record<keyof T, any>>;

// Options for database queries
export interface QueryOptions {
    skip?: number;
    limit?: number;
    sort?: Record<string, 1 | -1>;
    projection?: Record<string, 0 | 1>;
}

// Generic collection operations interface
export interface CollectionOperations<T, U> {
    findOne(filter: Filter<T>): Promise<T | null>;

    find(filter: Filter<T>, options?: QueryOptions): Promise<T[]>;

    findById(id: string): Promise<T | null>;

    create(data: U): Promise<T>;

    updateOne(filter: Filter<T>, update: Omit<Filter<T>, "_id">): Promise<T | null>;

    deleteOne(filter: Filter<T>): Promise<T | null>;

    delete(filter: Filter<T>): Promise<number>;

    count?(filter: Filter<T>): Promise<number>;
}

// Database adapter interface
export interface DatabaseAdapter {
    blogs: CollectionOperations<Blog, BlogData>;
    categories: CollectionOperations<Category, CategoryData>;
    tags: CollectionOperations<Tag, TagData>;
    users: CollectionOperations<User, UserData>;
    settings: CollectionOperations<SettingsEntry, SettingsEntryData>;
    plugins: CollectionOperations<Plugin, PluginData>;
    pluginHookMappings: CollectionOperations<PluginHookMapping, PluginHookMappingData>;
    comments: CollectionOperations<Comment, CommentData>;
    revisions: CollectionOperations<Revision, RevisionData>;
    media: CollectionOperations<Media, MediaData>;

    // Generated/computed operations
    generated: {
        getDetailedBlogObject(filter: Filter<Blog>): Promise<DetailedBlog | null>;
    };

    // Optional transaction support
    transaction?<T>(fn: (adapter: DatabaseAdapter) => Promise<T>): Promise<T>;
}