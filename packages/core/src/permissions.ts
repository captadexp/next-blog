import {Permission} from '@supergrowthai/next-blog-types/server';

/**
 * Predefined permissions for common operations
 */
export const Permissions = {
    // Blog permissions
    BLOGS_LIST: 'blogs:list' as Permission,
    BLOGS_READ: 'blogs:read' as Permission,
    BLOGS_CREATE: 'blogs:create' as Permission,
    BLOGS_UPDATE: 'blogs:update' as Permission,
    BLOGS_DELETE: 'blogs:delete' as Permission,
    BLOGS_ALL: 'blogs:all' as Permission,

    // Category permissions
    CATEGORIES_LIST: 'categories:list' as Permission,
    CATEGORIES_READ: 'categories:read' as Permission,
    CATEGORIES_CREATE: 'categories:create' as Permission,
    CATEGORIES_UPDATE: 'categories:update' as Permission,
    CATEGORIES_DELETE: 'categories:delete' as Permission,
    CATEGORIES_ALL: 'categories:all' as Permission,

    // Tag permissions
    TAGS_LIST: 'tags:list' as Permission,
    TAGS_READ: 'tags:read' as Permission,
    TAGS_CREATE: 'tags:create' as Permission,
    TAGS_UPDATE: 'tags:update' as Permission,
    TAGS_DELETE: 'tags:delete' as Permission,
    TAGS_ALL: 'tags:all' as Permission,

    // User permissions
    USERS_LIST: 'users:list' as Permission,
    USERS_READ: 'users:read' as Permission,
    USERS_CREATE: 'users:create' as Permission,
    USERS_UPDATE: 'users:update' as Permission,
    USERS_DELETE: 'users:delete' as Permission,
    USERS_ALL: 'users:all' as Permission,

    // Global permissions
    ALL_LIST: 'all:list' as Permission,
    ALL_READ: 'all:read' as Permission,
    ALL_CREATE: 'all:create' as Permission,
    ALL_UPDATE: 'all:update' as Permission,
    ALL_DELETE: 'all:delete' as Permission,

    // Plugin permissions
    PLUGINS_LIST: 'plugins:list' as Permission,
    PLUGINS_READ: 'plugins:read' as Permission,
    PLUGINS_CREATE: 'plugins:create' as Permission,
    PLUGINS_UPDATE: 'plugins:update' as Permission,
    PLUGINS_DELETE: 'plugins:delete' as Permission,
    PLUGINS_ALL: 'plugins:all' as Permission,

    // Super admin permission
    ALL: 'all:all' as Permission
};

/**
 * Permission sets for common roles
 */
export const PermissionSets = {
    // Super admin - full access to everything
    ADMIN: [Permissions.ALL],

    // Editor - can manage content but not users
    EDITOR: [
        Permissions.BLOGS_ALL,
        Permissions.CATEGORIES_ALL,
        Permissions.TAGS_ALL,
        Permissions.USERS_LIST,
        Permissions.USERS_READ
    ],

    // Author - can manage their own content 
    AUTHOR: [
        Permissions.BLOGS_CREATE,
        Permissions.BLOGS_READ,
        Permissions.BLOGS_LIST,
        Permissions.CATEGORIES_LIST,
        Permissions.CATEGORIES_READ,
        Permissions.TAGS_LIST,
        Permissions.TAGS_READ,
        Permissions.USERS_LIST,
        Permissions.USERS_READ
    ],

    // Reader - can only view content
    READER: [
        Permissions.BLOGS_LIST,
        Permissions.BLOGS_READ,
        Permissions.CATEGORIES_LIST,
        Permissions.CATEGORIES_READ,
        Permissions.TAGS_LIST,
        Permissions.TAGS_READ
    ]
};