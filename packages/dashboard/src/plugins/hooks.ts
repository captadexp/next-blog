/**
 * Registry of available plugin hooks in the dashboard
 * Provides type-safe constants for plugin developers
 */

// Core UI zones - these automatically get :before and :after variants
export const ZONES = {
    // Main pages
    DASHBOARD_HOME: 'dashboard-home',
    BLOGS_LIST: 'blogs-list',
    BLOGS_CREATE: 'blogs-create',
    BLOGS_EDIT: 'blogs-edit',
    BLOG_EDITOR: 'blog-editor',
    CATEGORIES_LIST: 'categories-list',
    TAGS_LIST: 'tags-list',
    USERS_LIST: 'users-list',
    SETTINGS_LIST: 'settings-list',
    PLUGINS_LIST: 'plugins-list',

    // Sections within pages
    BLOG_TABLE: 'blog-table',
    USER_TABLE: 'user-table',
    CATEGORIES_TABLE: 'categories-table',
    TAGS_TABLE: 'tags-table',
    SETTINGS_TABLE: 'settings-table',
    PLUGINS_TABLE: 'plugins-table',
    QUICK_DRAFT: 'quick-draft',
    STATS_SECTION: 'stats-section',

    // Toolbar areas
    BLOGS_LIST_TOOLBAR: 'blogs-list-toolbar',
    CATEGORIES_LIST_TOOLBAR: 'categories-list-toolbar',
    TAGS_LIST_TOOLBAR: 'tags-list-toolbar',
    SETTINGS_LIST_TOOLBAR: 'settings-list-toolbar',
    PLUGINS_LIST_TOOLBAR: 'plugins-list-toolbar',
} as const;

// Specific slot positions (legacy compatibility)
export const SLOTS = {
    DASHBOARD_HEADER: 'dashboard-header',
    DASHBOARD_WIDGET: 'dashboard-widget',
    DASHBOARD_FOOTER: 'dashboard-footer',
    EDITOR_SIDEBAR: 'editor-sidebar-widget',
    EDITOR_TOOLBAR: 'editor-toolbar',
    NAV_BEFORE: 'nav-before',
    NAV_AFTER: 'nav-after',
} as const;

// Server-side event hooks
export const EVENTS = {
    // Blog events
    BLOG_BEFORE_CREATE: 'blog:beforeCreate',
    BLOG_AFTER_CREATE: 'blog:afterCreate',
    BLOG_BEFORE_UPDATE: 'blog:beforeUpdate',
    BLOG_AFTER_UPDATE: 'blog:afterUpdate',
    BLOG_BEFORE_DELETE: 'blog:beforeDelete',
    BLOG_AFTER_DELETE: 'blog:afterDelete',
    BLOG_ON_READ: 'blog:onRead',
    BLOG_ON_LIST: 'blog:onList',

    // User events
    USER_BEFORE_CREATE: 'user:beforeCreate',
    USER_AFTER_CREATE: 'user:afterCreate',
    USER_BEFORE_UPDATE: 'user:beforeUpdate',
    USER_AFTER_UPDATE: 'user:afterUpdate',
    USER_BEFORE_DELETE: 'user:beforeDelete',
    USER_AFTER_DELETE: 'user:afterDelete',

    // Auth events
    AUTH_BEFORE_LOGIN: 'auth:beforeLogin',
    AUTH_AFTER_LOGIN: 'auth:afterLogin',
    AUTH_BEFORE_LOGOUT: 'auth:beforeLogout',
    AUTH_AFTER_LOGOUT: 'auth:afterLogout',

    // Category events
    CATEGORY_BEFORE_CREATE: 'category:beforeCreate',
    CATEGORY_AFTER_CREATE: 'category:afterCreate',
    CATEGORY_BEFORE_UPDATE: 'category:beforeUpdate',
    CATEGORY_AFTER_UPDATE: 'category:afterUpdate',
    CATEGORY_BEFORE_DELETE: 'category:beforeDelete',
    CATEGORY_AFTER_DELETE: 'category:afterDelete',

    // Tag events
    TAG_BEFORE_CREATE: 'tag:beforeCreate',
    TAG_AFTER_CREATE: 'tag:afterCreate',
    TAG_BEFORE_UPDATE: 'tag:beforeUpdate',
    TAG_AFTER_UPDATE: 'tag:afterUpdate',
    TAG_BEFORE_DELETE: 'tag:beforeDelete',
    TAG_AFTER_DELETE: 'tag:afterDelete',

    // Plugin events
    PLUGIN_BEFORE_INSTALL: 'plugin:beforeInstall',
    PLUGIN_AFTER_INSTALL: 'plugin:afterInstall',
    PLUGIN_BEFORE_UNINSTALL: 'plugin:beforeUninstall',
    PLUGIN_AFTER_UNINSTALL: 'plugin:afterUninstall',
    PLUGIN_BEFORE_ENABLE: 'plugin:beforeEnable',
    PLUGIN_AFTER_ENABLE: 'plugin:afterEnable',
    PLUGIN_BEFORE_DISABLE: 'plugin:beforeDisable',
    PLUGIN_AFTER_DISABLE: 'plugin:afterDisable',

    // Setting events
    SETTING_BEFORE_UPDATE: 'setting:beforeUpdate',
    SETTING_AFTER_UPDATE: 'setting:afterUpdate',
} as const;

// Helper functions for dynamic hook names
export const HOOKS = {
    ZONES,
    SLOTS,
    EVENTS,

    /**
     * Generate a zone hook name with position
     * @example HOOKS.zone('blogs-list', 'before') => 'blogs-list:before'
     */
    zone: (name: string, position: 'before' | 'after' = 'after') =>
        `${name}:${position}` as const,

    /**
     * Generate a dynamic page hook
     * @example HOOKS.page('blogs', 'header') => 'dashboard-blogs-header'
     */
    page: (page: string, position: string) =>
        `dashboard-${page}-${position}` as const,

    /**
     * Generate an editor hook
     * @example HOOKS.editor('blog', 'toolbar') => 'editor-blog-toolbar'
     */
    editor: (entity: string, position: string) =>
        `editor-${entity}-${position}` as const,

    /**
     * Generate a table row hook
     * @example HOOKS.row('blogs', blogId) => 'blogs-row-123'
     */
    row: (entity: string, id: string) =>
        `${entity}-row-${id}` as const,

    /**
     * Generate a custom hook name
     * @example HOOKS.custom('my-special-hook') => 'my-special-hook'
     */
    custom: (name: string) => name,
} as const;

// Type exports for TypeScript support
export type ZoneName = typeof ZONES[keyof typeof ZONES];
export type SlotName = typeof SLOTS[keyof typeof SLOTS];
export type EventName = typeof EVENTS[keyof typeof EVENTS];
export type HookName = ZoneName | SlotName | EventName | string;

// Re-export for convenience
export default HOOKS;