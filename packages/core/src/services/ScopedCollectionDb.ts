import type {DatabaseAdapter} from '@supergrowthai/next-blog-types/server';
import {applyMetadataScoping} from './MetadataScopingHelper.js';

/**
 * Base class for creating scoped database collections
 */
export abstract class ScopedCollectionDb<TCollection> {
    constructor(
        protected originalCollection: TCollection,
        protected pluginId: string
    ) {
    }

    /**
     * Creates a scoped collection
     */
    abstract createScoped(): TCollection;

    /**
     * Abstract method to get entity name for error messages
     */
    protected abstract getEntityName(): string;
}

/**
 * Base class for collections that have metadata and need scoping
 */
export abstract class ScopedMetadataCollectionDb<TCollection> extends ScopedCollectionDb<TCollection> {
    createScoped(): TCollection {
        return {
            ...this.originalCollection,

            // Override updateOne to handle metadata scoping
            updateOne: async (filter: any, update: any) => {
                if (update.metadata) {
                    const {metadata, ...otherUpdates} = update;

                    // Get the current entity to merge metadata properly
                    const entity = await (this.originalCollection as any).findOne(filter);
                    if (!entity) throw new Error(`${this.getEntityName()} not found`);

                    // Apply smart scoping
                    const scopedMetadata = applyMetadataScoping(metadata, {pluginId: this.pluginId});

                    const finalMetadata = {
                        ...entity.metadata,
                        ...scopedMetadata
                    };

                    return (this.originalCollection as any).updateOne(filter, {
                        ...otherUpdates,
                        metadata: finalMetadata,
                        updatedAt: Date.now()
                    });
                }
                return (this.originalCollection as any).updateOne(filter, update);
            },

            // Override create to handle metadata scoping
            create: async (data: any) => {
                if (data.metadata) {
                    const {metadata, ...otherData} = data;

                    // Apply smart scoping
                    const scopedMetadata = applyMetadataScoping(metadata, {pluginId: this.pluginId});

                    return (this.originalCollection as any).create({
                        ...otherData,
                        metadata: scopedMetadata
                    });
                }
                return (this.originalCollection as any).create(data);
            }
        } as TCollection;
    }
}

/**
 * Base class for read-only collections (plugins can only read, not modify)
 */
export abstract class ScopedReadOnlyCollectionDb<TCollection> extends ScopedCollectionDb<TCollection> {
    createScoped(): TCollection {
        return {
            // Only expose read operations
            find: (this.originalCollection as any).find,
            findOne: (this.originalCollection as any).findOne,
            findById: (this.originalCollection as any).findById,
            count: (this.originalCollection as any).count,
        } as TCollection;
    }
}

/**
 * Scoped blog database collection
 */
export class ScopedBlogDb extends ScopedMetadataCollectionDb<DatabaseAdapter['blogs']> {
    protected getEntityName(): string {
        return 'Blog';
    }
}

/**
 * Scoped comments database collection
 */
export class ScopedCommentsDb extends ScopedMetadataCollectionDb<DatabaseAdapter['comments']> {
    protected getEntityName(): string {
        return 'Comment';
    }
}

/**
 * Scoped revisions database collection
 */
export class ScopedRevisionsDb extends ScopedMetadataCollectionDb<DatabaseAdapter['revisions']> {
    protected getEntityName(): string {
        return 'Revision';
    }
}

/**
 * Scoped media database collection
 */
export class ScopedMediaDb extends ScopedMetadataCollectionDb<DatabaseAdapter['media']> {
    protected getEntityName(): string {
        return 'Media';
    }
}

/**
 * Scoped plugin database collection (read-only)
 */
export class ScopedPluginDb extends ScopedReadOnlyCollectionDb<DatabaseAdapter['plugins']> {
    protected getEntityName(): string {
        return 'Plugin';
    }
}

/**
 * Scoped plugin hook mapping database collection (read-only)
 */
export class ScopedPluginMappingDb extends ScopedReadOnlyCollectionDb<DatabaseAdapter['pluginHookMappings']> {
    protected getEntityName(): string {
        return 'PluginHookMapping';
    }
}

/**
 * Scoped category database collection
 */
export class ScopedCategoryDb extends ScopedMetadataCollectionDb<DatabaseAdapter['categories']> {
    protected getEntityName(): string {
        return 'Category';
    }
}

/**
 * Scoped tag database collection
 */
export class ScopedTagDb extends ScopedMetadataCollectionDb<DatabaseAdapter['tags']> {
    protected getEntityName(): string {
        return 'Tag';
    }
}

/**
 * Scoped user database collection
 */
export class ScopedUserDb extends ScopedMetadataCollectionDb<DatabaseAdapter['users']> {
    protected getEntityName(): string {
        return 'User';
    }
}

// Factory functions for creating scoped collections
export function createScopedBlogDb(
    originalBlogs: DatabaseAdapter['blogs'],
    pluginId: string
): DatabaseAdapter['blogs'] {
    return new ScopedBlogDb(originalBlogs, pluginId).createScoped();
}

export function createScopedCommentsDb(
    originalComments: DatabaseAdapter['comments'],
    pluginId: string
): DatabaseAdapter['comments'] {
    return new ScopedCommentsDb(originalComments, pluginId).createScoped();
}

export function createScopedRevisionsDb(
    originalRevisions: DatabaseAdapter['revisions'],
    pluginId: string
): DatabaseAdapter['revisions'] {
    return new ScopedRevisionsDb(originalRevisions, pluginId).createScoped();
}

export function createScopedMediaDb(
    originalMedia: DatabaseAdapter['media'],
    pluginId: string
): DatabaseAdapter['media'] {
    return new ScopedMediaDb(originalMedia, pluginId).createScoped();
}

export function createScopedPluginDb(
    originalPlugins: DatabaseAdapter['plugins'],
    pluginId: string
): DatabaseAdapter['plugins'] {
    return new ScopedPluginDb(originalPlugins, pluginId).createScoped();
}

export function createScopedPluginMappingDb(
    originalMappings: DatabaseAdapter['pluginHookMappings'],
    pluginId: string
): DatabaseAdapter['pluginHookMappings'] {
    return new ScopedPluginMappingDb(originalMappings, pluginId).createScoped();
}

export function createScopedCategoryDb(
    originalCategories: DatabaseAdapter['categories'],
    pluginId: string
): DatabaseAdapter['categories'] {
    return new ScopedCategoryDb(originalCategories, pluginId).createScoped();
}

export function createScopedTagDb(
    originalTags: DatabaseAdapter['tags'],
    pluginId: string
): DatabaseAdapter['tags'] {
    return new ScopedTagDb(originalTags, pluginId).createScoped();
}

export function createScopedUserDb(
    originalUsers: DatabaseAdapter['users'],
    pluginId: string
): DatabaseAdapter['users'] {
    return new ScopedUserDb(originalUsers, pluginId).createScoped();
}
