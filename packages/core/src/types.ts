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

export interface BlogData extends Partial<Blog> {
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

export type PermissionType = 'list' | 'read' | 'create' | 'update' | 'delete' | 'all';
export type EntityType = 'all' | 'blogs' | 'categories' | 'tags' | 'users' | 'settings' | 'plugins';
export type Permission = `${EntityType}:${PermissionType}` | 'plugins:reinstall';

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
        'settings': 50,
        'plugins': 60,
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

export interface PluginData extends Partial<Plugin> {
    name: string;
    description: string;
    version: string;
    type: PluginType;
    entryPoint: string;
    author: string;
}

export interface PluginHookMapping {
    _id: string;
    pluginId: string;
    hookName: string;
    priority: number;
    createdAt: number;
    updatedAt: number;
}

export interface PluginHookMappingData extends Partial<PluginHookMapping> {
    pluginId: string;
    hookName: string;
    priority: number;
}

/**
 * Interface for a plugin module
 * This defines the expected structure of a plugin module
 */
export interface PluginModule {
    // Plugin metadata
    name: string;
    version: string;
    description?: string;

    // Hooks implementation
    hooks?: {
        [hookName: string]: (context: any) => Promise<any> | any;
    };

    // Lifecycle methods
    postInstall?: (db: DatabaseAdapter, pluginId: string) => Promise<boolean>;
    onDelete?: (db: DatabaseAdapter, pluginId: string) => Promise<boolean>;
}

export interface DatabaseAdapter {
    blogs: CollectionOperations<Blog, BlogData>;
    categories: CollectionOperations<Category, CategoryData>;
    tags: CollectionOperations<Tag, TagData>;
    users: CollectionOperations<User, UserData>;
    settings: CollectionOperations<SettingsEntry, SettingsEntryData>;
    plugins: CollectionOperations<Plugin, PluginData>;
    pluginHookMappings: CollectionOperations<PluginHookMapping, PluginHookMappingData>;
}

export type Filter<T> = Partial<Record<keyof T, any>>;

export interface CollectionOperations<T, U> {
    findOne(filter: Filter<T>): Promise<T | null>;

    find(filter: Filter<T>, options?: { skip?: number, limit?: number }): Promise<T[]>;

    findById(id: string): Promise<T | null>;

    create(data: U): Promise<T>;

    updateOne(filter: Filter<T>, update: Omit<Filter<T>, "_id">): Promise<T | null>;

    deleteOne(filter: Filter<T>): Promise<T | null>;
}

export type EventPayload =
    | { event: "createBlog"; payload: Blog }
    | { event: "updateBlog"; payload: Blog }
    | { event: "deleteBlog"; payload: Blog }

    | { event: "createTag"; payload: Tag }
    | { event: "updateTag"; payload: Tag }
    | { event: "deleteTag"; payload: Tag }

    | { event: "createCategory"; payload: Category }
    | { event: "updateCategory"; payload: Category }
    | { event: "deleteCategory"; payload: Category }

    | { event: "createUser"; payload: User }
    | { event: "updateUser"; payload: User }
    | { event: "deleteUser"; payload: User }

    | { event: "createSettingsEntry"; payload: SettingsEntry }
    | { event: "updateSettingsEntry"; payload: SettingsEntry }
    | { event: "deleteSettingsEntry"; payload: SettingsEntry }

    | { event: "createPlugin"; payload: Plugin }
    | { event: "updatePlugin"; payload: Plugin }
    | { event: "deletePlugin"; payload: Plugin }

    | { event: "createPluginHookMapping"; payload: PluginHookMapping }
    | { event: "updatePluginHookMapping"; payload: PluginHookMapping }
    | { event: "deletePluginHookMapping"; payload: PluginHookMapping };

export interface ConfigurationCallbacks {
    on?<E extends EventPayload>(event: E['event'], payload: E['payload'] | null): void;
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
    db(): Promise<DatabaseAdapter>,
    byPassSecurity?: boolean,
    callbacks?: ConfigurationCallbacks,
    ui?: UIConfiguration
}
