import type {Category, HydratedBlog, HydratedCategory, Tag, User} from '@supergrowthai/next-blog-types/server';

type EntityWithMetadata = HydratedBlog | HydratedCategory | User | Tag | Category;

/**
 * Extracts the permalink URL from an entity's metadata.
 *
 * This function reads the permalink value stored by the permalink-manager plugin
 * in the entity's metadata. Returns undefined if no permalink is set.
 *
 * @param entity - Entity that may have permalink metadata (blog, user, category, tag)
 * @returns The permalink URL or undefined if not set
 *
 * @example
 * ```tsx
 * const blog = await getBlog('my-post');
 * const permalink = getPermalink(blog);
 * // Returns: "https://example.com/blog/my-post" or undefined
 *
 * // Use in Next.js generateMetadata
 * export async function generateMetadata({ params }): Promise<Metadata> {
 *   const blog = await getBlog(params.slug);
 *   const permalink = getPermalink(blog);
 *
 *   return {
 *     alternates: permalink ? { canonical: permalink } : undefined,
 *   };
 * }
 * ```
 *
 * @requires permalink-manager plugin to be installed and configured
 */
export function getPermalink(entity: EntityWithMetadata | null | undefined): string | undefined {
    return entity?.metadata?.['permalink-manager:permalink']?.permalink;
}

/**
 * Checks if an entity has a permalink set in its metadata.
 *
 * @param entity - Entity to check for permalink
 * @returns true if entity has a permalink, false otherwise
 *
 * @example
 * ```tsx
 * const blog = await getBlog('my-post');
 * if (hasPermalink(blog)) {
 *   // Entity has a custom permalink
 *   const url = getPermalink(blog);
 * } else {
 *   // Use default URL generation
 *   const url = `/${blog.slug}`;
 * }
 * ```
 */
export function hasPermalink(entity: EntityWithMetadata | null | undefined): boolean {
    return !!getPermalink(entity);
}

/**
 * Gets the permalink for an entity or returns '#' as a fallback.
 *
 * This utility is useful when you need a valid link value and don't want
 * to handle undefined cases. Returns '#' if no permalink is available.
 *
 * @param entity - Entity to get permalink for
 * @returns Permalink URL or '#' if not available
 *
 * @example
 * ```tsx
 * const blog = await getBlog('my-post');
 * const href = getPermalinkOrHash(blog);
 * // Always returns a string: "https://example.com/blog/my-post" or "#"
 *
 * <a href={href}>{blog.title}</a>
 * ```
 */
export function getPermalinkOrHash(entity: EntityWithMetadata | null | undefined): string {
    return getPermalink(entity) || '#';
}