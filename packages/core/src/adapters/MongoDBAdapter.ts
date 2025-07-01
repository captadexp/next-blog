import {
    Blog,
    BlogData,
    Category,
    CategoryData,
    CollectionOperations,
    Comment,
    CommentData,
    DatabaseAdapter,
    Filter,
    Media,
    MediaData,
    Permission,
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
} from "../types.js";
import {Collection, Db, MongoClient, ObjectId} from "mongodb"

export function oid(obj: ObjectId | string) {
    if (obj instanceof ObjectId) {
        return obj as ObjectId;
    } else if (ObjectId.isValid(obj))
        return new ObjectId(obj)
    else
        throw new Error("invalid ObjectId")
}

interface DbEntityTransformer<T extends U, U, DB = any> {
    // Convert from DB format (with ObjectId) to API format (with string IDs)
    fromDb(dbEntity: DB): T;

    // Convert from API format (with string IDs) to DB format (with ObjectId)
    toDb(entity: Partial<T> | U): DB;
}

class BlogTransformer implements DbEntityTransformer<Blog, BlogData> {
    fromDb(dbEntity: any): Blog {
        if (!dbEntity) return dbEntity;

        const result = {...dbEntity};

        // Convert _id from ObjectId to string
        if (result._id instanceof ObjectId) {
            result._id = result._id.toString();
        }

        // Convert userId if exists
        if (result.userId instanceof ObjectId) {
            result.userId = result.userId.toString();
        }

        // Convert category if exists
        if (result.category instanceof ObjectId) {
            result.category = result.category.toString();
        }

        // Convert tags array if exists
        if (Array.isArray(result.tags)) {
            result.tags = result.tags.map((tag: any) =>
                tag instanceof ObjectId ? tag.toString() : tag
            );
        }

        return result as Blog;
    }

    toDb(entity: Partial<Blog> | BlogData) {
        if (!entity) return entity;

        const result: any = {...entity};

        if (result._id) {
            result._id = oid(result._id);
        }

        if (result.userId) {
            result.userId = oid(result.userId);
        }

        if (result.category) {
            result.category = oid(result.category);
        }

        if (Array.isArray(result.tags)) {
            result.tags = result.tags.map((tag: string) => oid(tag));
        }

        return result;
    }
}

class CategoryTransformer implements DbEntityTransformer<Category, CategoryData> {
    fromDb(dbEntity: any): Category {
        if (!dbEntity) return dbEntity;

        const result = {...dbEntity};

        // Convert _id from ObjectId to string
        if (result._id instanceof ObjectId) {
            result._id = result._id.toString();
        }

        return result as Category;
    }

    toDb(entity: Partial<Category> | CategoryData) {
        if (!entity) return entity;

        const result: any = {...entity};

        if (result._id) {
            result._id = oid(result._id);
        }

        return result;
    }
}

class TagTransformer implements DbEntityTransformer<Tag, TagData> {
    fromDb(dbEntity: any): Tag {
        if (!dbEntity) return dbEntity;

        const result = {...dbEntity};

        // Convert _id from ObjectId to string
        if (result._id instanceof ObjectId) {
            result._id = result._id.toString();
        }

        return result as Tag;
    }

    toDb(entity: Partial<Tag> | TagData): any {
        if (!entity) return entity;

        const result: any = {...entity};

        if (result._id) {
            result._id = oid(result._id);
        }

        return result;
    }
}

class UserTransformer implements DbEntityTransformer<User, UserData> {
    fromDb(dbEntity: any): User {
        if (!dbEntity) return dbEntity;

        const result = {...dbEntity};

        // Convert _id from ObjectId to string
        if (result._id instanceof ObjectId) {
            result._id = result._id.toString();
        }

        return result as User;
    }

    toDb(entity: Partial<User> | UserData): any {
        if (!entity) return entity;

        const result: any = {...entity};

        if (result._id) {
            result._id = oid(result._id);
        }

        return result;
    }
}

class SettingsTransformer implements DbEntityTransformer<SettingsEntry, SettingsEntryData> {
    fromDb(dbEntity: any): SettingsEntry {
        if (!dbEntity) return dbEntity;

        const result = {...dbEntity};

        // Convert _id from ObjectId to string
        if (result._id instanceof ObjectId) {
            result._id = result._id.toString();
        }

        return result as SettingsEntry;
    }

    toDb(entity: Partial<SettingsEntry> | SettingsEntryData): any {
        if (!entity) return entity;

        const result: any = {...entity};

        if (result._id) {
            result._id = oid(result._id);
        }

        return result;
    }
}

class PluginTransformer implements DbEntityTransformer<Plugin, PluginData> {
    fromDb(dbEntity: any): Plugin {
        if (!dbEntity) return dbEntity;

        const result = {...dbEntity};

        // Convert _id from ObjectId to string
        if (result._id instanceof ObjectId) {
            result._id = result._id.toString();
        }

        return result as Plugin;
    }

    toDb(entity: Partial<Plugin> | PluginData): any {
        if (!entity) return entity;

        const result: any = {...entity};

        if (result._id) {
            result._id = oid(result._id);
        }

        return result;
    }
}

class PluginHookMappingTransformer implements DbEntityTransformer<PluginHookMapping, PluginHookMappingData> {
    fromDb(dbEntity: any): PluginHookMapping {
        if (!dbEntity) return dbEntity;

        const result = {...dbEntity};

        // Convert _id from ObjectId to string
        if (result._id instanceof ObjectId) {
            result._id = result._id.toString();
        }

        // Convert pluginId if exists
        if (result.pluginId instanceof ObjectId) {
            result.pluginId = result.pluginId.toString();
        }

        return result as PluginHookMapping;
    }

    toDb(entity: Partial<PluginHookMapping> | PluginHookMappingData): any {
        if (!entity) return entity;

        const result: any = {...entity};

        if (result._id) {
            result._id = oid(result._id);
        }

        if (result.pluginId) {
            result.pluginId = oid(result.pluginId);
        }

        return result;
    }
}

class CommentTransformer implements DbEntityTransformer<Comment, CommentData> {
    fromDb(dbEntity: any): Comment {
        if (!dbEntity) return dbEntity;
        const result = {...dbEntity};
        if (result._id instanceof ObjectId) {
            result._id = result._id.toString();
        }
        if (result.blogId instanceof ObjectId) {
            result.blogId = result.blogId.toString();
        }
        if (result.userId && result.userId instanceof ObjectId) {
            result.userId = result.userId.toString();
        }
        if (result.parentCommentId && result.parentCommentId instanceof ObjectId) {
            result.parentCommentId = result.parentCommentId.toString();
        }
        return result as Comment;
    }

    toDb(entity: Partial<Comment> | CommentData): any {
        if (!entity) return entity;
        const result: any = {...entity};
        if (result._id) {
            result._id = oid(result._id);
        }
        if (result.blogId) {
            result.blogId = oid(result.blogId);
        }
        if (result.userId) {
            result.userId = oid(result.userId);
        }
        if (result.parentCommentId) {
            result.parentCommentId = oid(result.parentCommentId);
        }
        return result;
    }
}

class RevisionTransformer implements DbEntityTransformer<Revision, RevisionData> {
    fromDb(dbEntity: any): Revision {
        if (!dbEntity) return dbEntity;
        const result = {...dbEntity};
        if (result._id instanceof ObjectId) {
            result._id = result._id.toString();
        }
        if (result.blogId instanceof ObjectId) {
            result.blogId = result.blogId.toString();
        }
        if (result.userId instanceof ObjectId) {
            result.userId = result.userId.toString();
        }
        return result as Revision;
    }

    toDb(entity: Partial<Revision> | RevisionData): any {
        if (!entity) return entity;
        const result: any = {...entity};
        if (result._id) {
            result._id = oid(result._id);
        }
        if (result.blogId) {
            result.blogId = oid(result.blogId);
        }
        if (result.userId) {
            result.userId = oid(result.userId);
        }
        return result;
    }
}

class MediaTransformer implements DbEntityTransformer<Media, MediaData> {
    fromDb(dbEntity: any): Media {
        if (!dbEntity) return dbEntity;
        const result = {...dbEntity};
        if (result._id instanceof ObjectId) {
            result._id = result._id.toString();
        }
        if (result.userId instanceof ObjectId) {
            result.userId = result.userId.toString();
        }
        return result as Media;
    }

    toDb(entity: Partial<Media> | MediaData): any {
        if (!entity) return entity;
        const result: any = {...entity};
        if (result._id) {
            result._id = oid(result._id);
        }
        if (result.userId) {
            result.userId = oid(result.userId);
        }
        return result;
    }
}

export default class MongoDBAdapter implements DatabaseAdapter {
    private db: Db;
    private readonly blogTransformer: BlogTransformer;
    private readonly categoryTransformer: CategoryTransformer;
    private readonly tagTransformer: TagTransformer;
    private readonly userTransformer: UserTransformer;
    private readonly settingsTransformer: SettingsTransformer;
    private readonly pluginTransformer: PluginTransformer;
    private readonly pluginHookMappingTransformer: PluginHookMappingTransformer;
    private readonly commentTransformer: CommentTransformer;
    private readonly revisionTransformer: RevisionTransformer;
    private readonly mediaTransformer: MediaTransformer;

    constructor(dbName: string, client: MongoClient) {
        this.db = client.db(dbName);
        this.blogTransformer = new BlogTransformer();
        this.categoryTransformer = new CategoryTransformer();
        this.tagTransformer = new TagTransformer();
        this.userTransformer = new UserTransformer();
        this.settingsTransformer = new SettingsTransformer();
        this.pluginTransformer = new PluginTransformer();
        this.pluginHookMappingTransformer = new PluginHookMappingTransformer();
        this.commentTransformer = new CommentTransformer();
        this.revisionTransformer = new RevisionTransformer();
        this.mediaTransformer = new MediaTransformer();
    }

    get blogs(): CollectionOperations<Blog, BlogData> {
        return this.getCollectionOperations<Blog, BlogData>('blogs', this.blogTransformer);
    }

    get categories(): CollectionOperations<Category, CategoryData> {
        return this.getCollectionOperations<Category, CategoryData>('categories', this.categoryTransformer);
    }

    get tags(): CollectionOperations<Tag, TagData> {
        return this.getCollectionOperations<Tag, TagData>('tags', this.tagTransformer);
    }

    get users(): CollectionOperations<User, UserData> {
        const collection: Collection<any> = this.db.collection('users');
        const transformer = this.userTransformer;

        return {
            findOne: async (filter: Filter<User>) => {
                const dbFilter = transformer.toDb(filter);
                const result = await collection.findOne(dbFilter);
                return result ? transformer.fromDb(result) : null;
            },

            find: async (filter: Filter<User>, options) => {
                const dbFilter = transformer.toDb(filter);
                let query = collection.find(dbFilter);

                if (options?.skip)
                    query = query.skip(options.skip);
                if (options?.limit)
                    query = query.limit(options.limit);

                const results = await query.toArray();
                return results.map(result => transformer.fromDb(result));
            },

            findById: async (id: string) => {
                const result = await collection.findOne({_id: oid(id)});
                return result ? transformer.fromDb(result) : null;
            },

            create: async (data: UserData) => {
                const users = await collection.find({}).toArray();
                const isFirstUser = users.length === 0;

                // Set default permissions for the first user (admin access)
                const permissions: Permission[] = isFirstUser
                    ? ['all:all']
                    : data.permissions || [];

                const userData = {
                    ...data,
                    permissions,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };

                const result = await collection.insertOne(transformer.toDb(userData));
                return transformer.fromDb({_id: result.insertedId, ...userData});
            },

            updateOne: async (filter: Filter<User>, update: Omit<Filter<User>, "_id">) => {
                const dbFilter = transformer.toDb(filter);
                const updatedData = {
                    ...update,
                    updatedAt: Date.now()
                };
                const result = await collection.findOneAndUpdate(
                    dbFilter,
                    {$set: transformer.toDb(updatedData)},
                    {returnDocument: "after"}
                );
                return result ? transformer.fromDb(result) : null;
            },

            deleteOne: async (filter: Filter<User>) => {
                const dbFilter = transformer.toDb(filter);
                const result = await collection.findOneAndDelete(dbFilter);
                return result ? transformer.fromDb(result) : null;
            },
            delete: async (filter: Filter<User>): Promise<number> => {
                const dbFilter = transformer.toDb(filter);
                const result = await collection.deleteMany(dbFilter);
                return result.deletedCount || 0;
            },
        };
    }

    get settings(): CollectionOperations<SettingsEntry, SettingsEntryData> {
        return this.getCollectionOperations<SettingsEntry, SettingsEntryData>('settings', this.settingsTransformer);
    }

    get plugins(): CollectionOperations<Plugin, PluginData> {
        return this.getCollectionOperations<Plugin, PluginData>('plugins', this.pluginTransformer);
    }

    get pluginHookMappings(): CollectionOperations<PluginHookMapping, PluginHookMappingData> {
        return this.getCollectionOperations<PluginHookMapping, PluginHookMappingData>('plugin-hook-mappings', this.pluginHookMappingTransformer);
    }

    get comments(): CollectionOperations<Comment, CommentData> {
        return this.getCollectionOperations<Comment, CommentData>('comments', this.commentTransformer);
    }

    get revisions(): CollectionOperations<Revision, RevisionData> {
        return this.getCollectionOperations<Revision, RevisionData>('revisions', this.revisionTransformer);
    }

    get media(): CollectionOperations<Media, MediaData> {
        return this.getCollectionOperations<Media, MediaData>('media', this.mediaTransformer);
    }

    private getCollectionOperations<T extends U, U>(
        collectionName: string,
        transformer: DbEntityTransformer<T, U>
    ): CollectionOperations<T, U> {
        const collection: Collection<any> = this.db.collection(collectionName);

        return {
            findOne: async (filter: Filter<T>) => {
                const dbFilter = transformer.toDb(filter);
                const result = await collection.findOne(dbFilter);
                return result ? transformer.fromDb(result) : null;
            },

            find: async (filter: Filter<T>, options) => {
                const dbFilter = transformer.toDb(filter);
                let query = collection.find(dbFilter);

                if (options?.skip)
                    query = query.skip(options.skip);
                if (options?.limit)
                    query = query.limit(options.limit);

                const results = await query.toArray();
                return results.map(result => transformer.fromDb(result));
            },

            findById: async (id: string) => {
                const result = await collection.findOne({_id: oid(id)});
                return result ? transformer.fromDb(result) : null;
            },

            create: async (data: U) => {
                // Convert data to DB format
                const dbData = transformer.toDb(data);

                // For create operations, add timestamps
                const dataWithTimestamps = {
                    ...dbData,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };

                const result = await collection.insertOne(dataWithTimestamps);
                return transformer.fromDb({_id: result.insertedId, ...dataWithTimestamps});
            },

            updateOne: async (filter: Filter<T>, update: Omit<Filter<T>, "_id">) => {
                const dbFilter = transformer.toDb(filter);
                const updatedData = {
                    ...update,
                    updatedAt: Date.now()
                };
                const dbUpdate = transformer.toDb(updatedData as any);

                const result = await collection.findOneAndUpdate(
                    dbFilter,
                    {$set: dbUpdate},
                    {returnDocument: "after"}
                );
                return result ? transformer.fromDb(result) : null;
            },

            deleteOne: async (filter: Filter<T>) => {
                const dbFilter = transformer.toDb(filter);
                const result = await collection.findOneAndDelete(dbFilter);
                return result ? transformer.fromDb(result) : null;
            },

            delete: async (filter: Filter<T>): Promise<number> => {
                const dbFilter = transformer.toDb(filter);
                const result = await collection.deleteMany(dbFilter);
                return result.deletedCount || 0;
            },
        };
    }
}
