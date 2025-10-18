import {
    Blog,
    BlogData,
    BrandedId,
    Category,
    CategoryData,
    CollectionOperations,
    Comment,
    CommentData,
    createId,
    DatabaseAdapter,
    DetailedBlog,
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
} from "@supergrowthai/next-blog-types/server";
import {Collection, Db, MongoClient, ObjectId} from "mongodb"

export type * from "@supergrowthai/next-blog-types";

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

        // Convert _id from ObjectId to BrandedId
        if (result._id instanceof ObjectId) {
            result._id = createId.blog(result._id.toString());
        }

        // Convert userId if exists
        if (result.userId instanceof ObjectId) {
            result.userId = createId.user(result.userId.toString());
        }

        // Convert categoryId if exists
        if (result.categoryId instanceof ObjectId) {
            result.categoryId = createId.category(result.categoryId.toString());
        }

        // Convert tagIds array if exists
        if (Array.isArray(result.tagIds)) {
            result.tagIds = result.tagIds.map((tag: any) =>
                tag instanceof ObjectId ? createId.tag(tag.toString()) : tag
            );
        }

        // Convert featuredMediaId if exists
        if (result.featuredMediaId instanceof ObjectId) {
            result.featuredMediaId = createId.media(result.featuredMediaId.toString());
        }

        // Convert parentId if exists
        if (result.parentId instanceof ObjectId) {
            result.parentId = createId.blog(result.parentId.toString());
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

        if (result.categoryId) {
            result.categoryId = oid(result.categoryId);
        }

        if (Array.isArray(result.tagIds)) {
            result.tagIds = result.tagIds.map((tag: string | BrandedId<"Tag">) => oid(tag));
        }

        if (result.featuredMediaId) {
            result.featuredMediaId = oid(result.featuredMediaId);
        }

        if (result.parentId) {
            result.parentId = oid(result.parentId);
        }

        return result;
    }
}

class CategoryTransformer implements DbEntityTransformer<Category, CategoryData> {
    fromDb(dbEntity: any): Category {
        if (!dbEntity) return dbEntity;

        const result = {...dbEntity};

        // Convert _id from ObjectId to BrandedId
        if (result._id instanceof ObjectId) {
            result._id = createId.category(result._id.toString());
        }

        // Convert parentId if exists
        if (result.parentId instanceof ObjectId) {
            result.parentId = createId.category(result.parentId.toString());
        }

        return result as Category;
    }

    toDb(entity: Partial<Category> | CategoryData) {
        if (!entity) return entity;

        const result: any = {...entity};

        if (result._id) {
            result._id = oid(result._id);
        }

        if (result.parentId) {
            result.parentId = oid(result.parentId);
        }

        return result;
    }
}

class TagTransformer implements DbEntityTransformer<Tag, TagData> {
    fromDb(dbEntity: any): Tag {
        if (!dbEntity) return dbEntity;

        const result = {...dbEntity};

        // Convert _id from ObjectId to BrandedId
        if (result._id instanceof ObjectId) {
            result._id = createId.tag(result._id.toString());
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

        // Convert _id from ObjectId to BrandedId
        if (result._id instanceof ObjectId) {
            result._id = createId.user(result._id.toString());
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

        // Convert _id from ObjectId to BrandedId
        if (result._id instanceof ObjectId) {
            result._id = createId.settingsEntry(result._id.toString());
        }

        // Convert ownerId if exists
        if (result.ownerId instanceof ObjectId) {
            result.ownerId = createId.user(result.ownerId.toString());
        }

        return result as SettingsEntry;
    }

    toDb(entity: Partial<SettingsEntry> | SettingsEntryData): any {
        if (!entity) return entity;

        const result: any = {...entity};

        if (result._id) {
            result._id = oid(result._id);
        }

        if (result.ownerId) {
            result.ownerId = oid(result.ownerId);
        }

        return result;
    }
}

class PluginTransformer implements DbEntityTransformer<Plugin, PluginData> {
    fromDb(dbEntity: any): Plugin {
        if (!dbEntity) return dbEntity;

        const result = {...dbEntity};

        // Convert _id from ObjectId to BrandedId
        if (result._id instanceof ObjectId) {
            result._id = createId.plugin(result._id.toString());
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

        // Convert _id from ObjectId to BrandedId
        if (result._id instanceof ObjectId) {
            result._id = createId.pluginHookMapping(result._id.toString());
        }

        // Convert pluginId if exists
        if (result.pluginId instanceof ObjectId) {
            result.pluginId = createId.plugin(result.pluginId.toString());
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
            result._id = createId.comment(result._id.toString());
        }
        if (result.blogId instanceof ObjectId) {
            result.blogId = createId.blog(result.blogId.toString());
        }
        if (result.userId && result.userId instanceof ObjectId) {
            result.userId = createId.user(result.userId.toString());
        }
        if (result.parentCommentId && result.parentCommentId instanceof ObjectId) {
            result.parentCommentId = createId.comment(result.parentCommentId.toString());
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
            result._id = createId.revision(result._id.toString());
        }
        if (result.blogId instanceof ObjectId) {
            result.blogId = createId.blog(result.blogId.toString());
        }
        if (result.userId instanceof ObjectId) {
            result.userId = createId.user(result.userId.toString());
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
            result._id = createId.media(result._id.toString());
        }
        if (result.userId instanceof ObjectId) {
            result.userId = createId.user(result.userId.toString());
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

export class MongoDBAdapter implements DatabaseAdapter {
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

            count: async (filter: Filter<User>) => {
                const dbFilter = transformer.toDb(filter);
                return await collection.countDocuments(dbFilter);
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

    get generated() {
        const self = this;
        return {
            getHydratedBlog: async (filter: Filter<Blog>): Promise<DetailedBlog | null> => {

                const blogCollection: Collection<any> = this.db.collection('blogs');
                const dbFilter = this.blogTransformer.toDb(filter);

                const pipeline = [
                    {$match: dbFilter},
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'userId',
                            foreignField: '_id',
                            as: 'author'
                        }
                    },
                    {$unwind: '$author'},
                    {
                        $lookup: {
                            from: 'categories',
                            localField: 'categoryId',
                            foreignField: '_id',
                            as: 'category'
                        }
                    },
                    {$unwind: '$category'},
                    {
                        $lookup: {
                            from: 'tags',
                            localField: 'tagIds',
                            foreignField: '_id',
                            as: 'tags'
                        }
                    },
                    {
                        $lookup: {
                            from: 'media',
                            localField: 'featuredMediaId',
                            foreignField: '_id',
                            as: 'featuredMedia'
                        }
                    },
                    {$unwind: {path: '$featuredMedia', preserveNullAndEmptyArrays: true}},
                    {
                        $project: {
                            userId: 0, // Exclude original userId
                            categoryId: 0, // Exclude original categoryId
                            tagIds: 0, // Exclude original tagIds
                            featuredMediaId: 0, // Exclude since we have populated featuredMedia
                            parentId: 0, // Exclude original parentId if populated
                        }
                    }
                ];

                const results = await blogCollection.aggregate(pipeline).toArray();

                if (results.length === 0) {
                    return null;
                }

                const result = results[0];

                // Transform the nested objects using transformers
                const user = this.userTransformer.fromDb(result.author);
                const category = this.categoryTransformer.fromDb(result.category);
                const tags = result.tags.map((tag: any) => this.tagTransformer.fromDb(tag));
                const featuredMedia = result.featuredMedia ? this.mediaTransformer.fromDb(result.featuredMedia) : undefined;

                // Transform the main blog object
                const blog = this.blogTransformer.fromDb(result);

                // Return hydrated blog with proper field names
                return {
                    ...blog,
                    user, // userId → user
                    category, // categoryId → category
                    tags, // tagIds → tags
                    featuredMedia, // featuredMediaId → featuredMedia
                };
            },
            getDetailedBlogObject: async function (filter: Filter<Blog>): Promise<DetailedBlog | null> {
                return self.generated.getHydratedBlog(filter);
            }
        }
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

            count: async (filter: Filter<T>) => {
                const dbFilter = transformer.toDb(filter);
                return await collection.countDocuments(dbFilter);
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

export default {}