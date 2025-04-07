import type {NextRequest} from "next/server";

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
}

export interface BlogData {
    title: string;
    slug: string;
    content: string;
    category: string;
    tags: string[];
    userId: string;
}

export interface Category {
    _id: string;
    name: string;
    description: string;
    slug: string;
    createdAt: number;
    updatedAt: number;
}

export interface CategoryData {
    name: string;
    description: string;
    slug: string;
    // Optional timestamps - will be set automatically on create
    createdAt?: number;
    updatedAt?: number;
}

export interface Tag {
    _id: string;
    name: string;
    slug: string;
    blogs: string[];
    createdAt: number;
    updatedAt: number;
}

export interface TagData {
    name: string;
    slug: string;
    blogs: string[];
    // Optional timestamps - will be set automatically on create
    createdAt?: number;
    updatedAt?: number;
}

export type PermissionType = 'list' | 'read' | 'create' | 'update' | 'delete' | 'all';
export type EntityType = 'all' | 'blogs' | 'categories' | 'tags' | 'users';
export type Permission = `${EntityType}:${PermissionType}`;

// Permission weight constants
export const PERMISSION_WEIGHTS = {
    // Action weights (lower numbers represent less power)
    action: {
        'list': 10,
        'read': 20,
        'create': 30,
        'update': 40,
        'delete': 50,
        'all': 100
    },
    // Entity weights (all is highest)
    entity: {
        'blogs': 10,
        'categories': 20,
        'tags': 30,
        'users': 40,
        'all': 100
    }
};

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

export interface UserData {
    username: string;
    email: string;
    password: string;
    name: string;
    slug: string;
    bio: string;
    permissions?: Permission[];
    // Optional timestamps - will be set automatically on create
    createdAt?: number;
    updatedAt?: number;
}

// Author interfaces removed - User interface now handles all author functionality

export interface DatabaseProvider {
    blogs: CollectionOperations<Blog, BlogData>;
    categories: CollectionOperations<Category, CategoryData>;
    tags: CollectionOperations<Tag, TagData>;
    users: CollectionOperations<User, UserData>;
}

export type Filter<T> = Partial<Record<keyof T, any>>;

export interface CollectionOperations<T, U> {
    findOne(filter: Filter<T>): Promise<T | null>;

    find(filter: Filter<T>, options?: { skip?: number, limit?: number }): Promise<T[]>;

    findById(id: string): Promise<T | null>;

    create(data: U): Promise<T>;

    updateOne(filter: Filter<T>, update: Omit<Filter<T>, "_id">): Promise<T>;

    updateMany(filter: Filter<T>, update: Omit<Filter<T>, "_id">): Promise<T[]>;

    deleteOne(filter: Filter<T>): Promise<T>;
}

export type EventPayload =
    | { event: "createBlog"; payload: Blog }
    | { event: "createTag"; payload: Tag }
    | { event: "createCategory"; payload: Category }
    | { event: "createUser"; payload: User }
    | { event: "updateBlog"; payload: Blog }
    | { event: "updateTag"; payload: Tag }
    | { event: "updateCategory"; payload: Category }
    | { event: "updateUser"; payload: User }
    | { event: "deleteBlog"; payload: Blog }
    | { event: "deleteTag"; payload: Tag }
    | { event: "deleteCategory"; payload: Category }
    | { event: "deleteUser"; payload: User };

export interface ConfigurationCallbacks {
    on?<E extends EventPayload>(event: E['event'], payload: E['payload']): void;
}

export interface UIConfiguration {
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
        menuItems?: Array<{
            label: string;
            path: string;
            icon?: string;
        }>;
    };
}

export type Configuration = {
    db(): Promise<DatabaseProvider>,
    byPassSecurity?: boolean,
    callbacks?: ConfigurationCallbacks,
    ui?: UIConfiguration
}

export type CNextRequest = NextRequest & {
    _params: Record<string, string>,
    db(): Promise<DatabaseProvider>,
    configuration: Configuration,
    sessionUser: User
}
