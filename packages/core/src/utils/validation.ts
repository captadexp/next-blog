/**
 * Utility functions for request validation and key filtering
 */

/**
 * Filters an object to only include allowed keys
 * @param source - The source object to filter
 * @param allowedKeys - Array of allowed key names
 * @returns A new object containing only the allowed keys
 */
export function filterKeys<T extends Record<string, any>>(
    source: any,
    allowedKeys: readonly (keyof T)[]
): Partial<T> {
    if (!source || typeof source !== 'object') {
        return {};
    }

    const filtered: Partial<T> = {};

    for (const key of allowedKeys) {
        if (source[key] !== undefined) {
            filtered[key] = source[key];
        }
    }

    return filtered;
}

/**
 * Blog data field whitelists
 */
export const BLOG_CREATE_FIELDS = [
    'title', 'slug', 'content', 'categoryId', 'tagIds',
    'metadata', 'type', 'status', 'featuredMediaId', 'excerpt', 'parentId'
] as const;

export const BLOG_UPDATE_FIELDS = [
    'title', 'slug', 'content', 'categoryId', 'tagIds',
    'metadata', 'type', 'status', 'featuredMediaId', 'excerpt', 'parentId'
] as const;

/**
 * Tag data field whitelists
 */
export const TAG_CREATE_FIELDS = [
    'name', 'slug', 'description', 'metadata'
] as const;

export const TAG_UPDATE_FIELDS = [
    'name', 'slug', 'description', 'metadata'
] as const;

/**
 * Category data field whitelists
 */
export const CATEGORY_CREATE_FIELDS = [
    'name', 'description', 'slug', 'parentId', 'metadata'
] as const;

export const CATEGORY_UPDATE_FIELDS = [
    'name', 'description', 'slug', 'parentId', 'metadata'
] as const;

/**
 * User data field whitelists
 */
export const USER_CREATE_FIELDS = [
    'username', 'email', 'password', 'name', 'slug', 'bio', 'permissions', 'metadata'
] as const;

export const USER_UPDATE_FIELDS = [
    'username', 'email', 'password', 'name', 'slug', 'bio', 'permissions', 'metadata'
] as const;

/**
 * Settings data field whitelists
 */
export const SETTINGS_CREATE_FIELDS = [
    'key', 'value', 'ownerId', 'ownerType', 'isSecure', 'metadata'
] as const;

export const SETTINGS_UPDATE_FIELDS = [
    'key', 'value', 'metadata'
] as const;