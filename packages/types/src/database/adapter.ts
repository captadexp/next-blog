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
    HydratedBlog,
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

    count(filter: Filter<T>): Promise<number>;
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
        getHydratedBlog(filter: Filter<Blog>): Promise<HydratedBlog | null>;
        getHydratedBlogs(filter: Filter<Blog>, options?: { skip?: number, limit?: number }): Promise<HydratedBlog[]>;
        getRecentBlogs(limit?: number): Promise<HydratedBlog[]>;
        getRelatedBlogs(blogId: string, limit?: number): Promise<HydratedBlog[]>;
        getHydratedAuthor(userId: string): Promise<User | null>;
        getAuthorBlogs(userId: string, options?: { skip?: number, limit?: number }): Promise<HydratedBlog[]>;
        getHydratedCategories(): Promise<Category[]>;
        getCategoryWithBlogs(categoryId: string, options?: { skip?: number, limit?: number }): Promise<{
            category: Category | null,
            blogs: HydratedBlog[]
        }>;
        getHydratedTags(): Promise<Tag[]>;
        getTagWithBlogs(tagId: string, options?: { skip?: number, limit?: number }): Promise<{
            tag: Tag | null,
            blogs: HydratedBlog[]
        }>;
        getBlogsByTag(tagSlug: string, options?: { skip?: number, limit?: number }): Promise<HydratedBlog[]>;
        getBlogsByCategory(categorySlug: string, options?: { skip?: number, limit?: number }): Promise<HydratedBlog[]>;
    };

    // Optional transaction support
    transaction?<T>(fn: (adapter: DatabaseAdapter) => Promise<T>): Promise<T>;
}