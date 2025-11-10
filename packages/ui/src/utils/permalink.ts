import type {Category, HydratedBlog, HydratedCategory, Tag, User} from '@supergrowthai/next-blog-types/server';

type EntityWithMetadata = HydratedBlog | HydratedCategory | User | Tag | Category;

export function getPermalink(entity: EntityWithMetadata | null | undefined): string | undefined {
    return entity?.metadata?.['permalink-manager:permalink']?.permalink;
}

export function hasPermalink(entity: EntityWithMetadata | null | undefined): boolean {
    return !!getPermalink(entity);
}

export function getPermalinkOrHash(entity: EntityWithMetadata | null | undefined): string {
    return getPermalink(entity) || '#';
}