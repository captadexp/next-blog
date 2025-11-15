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
    Filter,
    HydratedBlog,
    HydratedBlogQueryOptions,
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

abstract class BaseMongoTransformer<T extends U, U> implements DbEntityTransformer<T, U> {
    // Schema: only declare fields that need ObjectId conversion
    // Minimal declarations - only what absolutely needs conversion
    protected schema: Record<string, any> = {};

    // Convert filter for MongoDB queries (separate from data conversion)
    toDbFilter(filter: any): any {
        if (!filter) return filter;

        // Fast path for single _id (80% of queries)
        if (filter._id && Object.keys(filter).length === 1) {
            return this.fastConvertId(filter);
        }

        // Handle general case
        return this.toDbFilterGeneral(filter);
    }

    // Abstract methods that each transformer implements
    abstract fromDb(dbEntity: any): T;

    abstract toDb(entity: Partial<T> | U): any;

    private fastConvertId(filter: any): any {
        const {_id} = filter;

        // Only convert if _id is declared in schema
        if (!this.schema._id) {
            return filter;
        }

        if (typeof _id === 'string') {
            return {_id: oid(_id)};
        }
        if (_id?.$in) {
            return {
                _id: {
                    ...filter._id,
                    $in: _id.$in.map((id: any) => typeof id === 'string' ? oid(id) : id)
                }
            };
        }
        if (_id?.$ne) {
            return {
                _id: {
                    ...filter._id,
                    $ne: typeof _id.$ne === 'string' ? oid(_id.$ne) : _id.$ne
                }
            };
        }
        return filter;
    }

    private toDbFilterGeneral(filter: any): any {
        const result: any = {};

        for (const [key, value] of Object.entries(filter)) {
            if (this.schema[key]) {
                // Only convert fields declared in schema (minimal set)
                result[key] = this.convertToObjectId(key, value);
            } else if (key.startsWith('$')) {
                // MongoDB root operators ($or, $and, etc.)
                result[key] = this.convertOperator(key, value);
            } else {
                // Pass through all other fields as-is
                result[key] = value;
            }
        }

        return result;
    }

    private convertToObjectId(fieldName: string, value: any): any {
        // Handle string ID
        if (typeof value === 'string') {
            return oid(value);
        }

        if (value instanceof ObjectId)
            return value;

        // Handle array of IDs (for fields like tagIds)
        if (Array.isArray(value)) {
            return value.map(v => typeof v === 'string' ? oid(v) : v);
        }

        // Handle operators on ID fields
        if (value && typeof value === 'object') {
            const result: any = {};
            for (const [op, val] of Object.entries(value)) {
                switch (op) {
                    case '$in':
                    case '$nin':
                    case '$all':
                        result[op] = Array.isArray(val)
                            ? val.map((v: any) => typeof v === 'string' ? oid(v) : v)
                            : val;
                        break;
                    case '$ne':
                    case '$eq':
                    case '$gt':
                    case '$gte':
                    case '$lt':
                    case '$lte':
                        result[op] = typeof val === 'string' ? oid(val) : val;
                        break;
                    case '$exists':
                    case '$type':
                    case '$size':
                        result[op] = val;
                        break;
                    default:
                        console.warn(`MongoDBAdapter: Unknown operator '${op}' for field '${fieldName}', passing through as-is`);
                        result[op] = val;
                }
            }
            return result;
        }

        return value;
    }

    private convertOperator(operator: string, value: any): any {
        switch (operator) {
            case '$or':
            case '$and':
            case '$nor':
                // Recursively convert array of conditions
                if (Array.isArray(value)) {
                    return value.map(condition => this.toDbFilterGeneral(condition));
                }
                console.warn(`MongoDBAdapter: Operator '${operator}' expects array, got ${typeof value}`);
                return value;

            case '$not':
                // Recursively convert nested condition
                return this.toDbFilterGeneral(value);

            default:
                // Unknown root operator, pass through
                return value;
        }
    }
}

class BlogTransformer extends BaseMongoTransformer<Blog, BlogData> {
    protected schema = {
        _id: true,
        userId: true,
        categoryId: true,
        tagIds: true,
        featuredMediaId: true,
        parentId: true
    };

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

class CategoryTransformer extends BaseMongoTransformer<Category, CategoryData> {
    protected schema = {
        _id: true,
        parentId: true
    };

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

class TagTransformer extends BaseMongoTransformer<Tag, TagData> {
    protected schema = {
        _id: true
    };

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

class UserTransformer extends BaseMongoTransformer<User, UserData> {
    protected schema = {
        _id: true
    };

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

class SettingsTransformer extends BaseMongoTransformer<SettingsEntry, SettingsEntryData> {
    protected schema = {
        _id: true,
        ownerId: true
    };

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

class PluginTransformer extends BaseMongoTransformer<Plugin, PluginData> {
    protected schema = {
        _id: true
    };

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

class PluginHookMappingTransformer extends BaseMongoTransformer<PluginHookMapping, PluginHookMappingData> {
    protected schema = {
        _id: true,
        pluginId: true
    };

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

class CommentTransformer extends BaseMongoTransformer<Comment, CommentData> {
    protected schema = {
        _id: true,
        blogId: true,
        userId: true,
        parentCommentId: true
    };

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

class RevisionTransformer extends BaseMongoTransformer<Revision, RevisionData> {
    protected schema = {
        _id: true,
        blogId: true,
        userId: true
    };

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

class MediaTransformer extends BaseMongoTransformer<Media, MediaData> {
    protected schema = {
        _id: true,
        userId: true
    };

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
                const dbFilter = transformer.toDbFilter(filter);
                const result = await collection.findOne(dbFilter);
                return result ? transformer.fromDb(result) : null;
            },

            find: async (filter: Filter<User>, options) => {
                const dbFilter = transformer.toDbFilter(filter);
                let query = collection.find(dbFilter);

                if (options?.projection)
                    query = query.project(options.projection);
                if (options?.sort)
                    query = query.sort(options.sort);
                if (options?.skip)
                    query = query.skip(options.skip);
                if (options?.limit)
                    query = query.limit(options.limit);

                const results = await query.toArray();
                return results.map(result => transformer.fromDb(result));
            },

            count: async (filter: Filter<User>) => {
                const dbFilter = transformer.toDbFilter(filter);
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
                const dbFilter = transformer.toDbFilter(filter);
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
                const dbFilter = transformer.toDbFilter(filter);
                const result = await collection.findOneAndDelete(dbFilter);
                return result ? transformer.fromDb(result) : null;
            },
            delete: async (filter: Filter<User>): Promise<number> => {
                const dbFilter = transformer.toDbFilter(filter);
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

        // ---------- tiny utils ----------
        const uniq = <T>(xs: T[]) => Array.from(new Set(xs));
        const truthy = <T>(x: T | null | undefined): x is T => !!x;

        // ---------- swappable loaders (cache-ready) ----------
        const loadUsersByIds = async (ids: string[], projection?: Record<string, 0 | 1>) => {
            if (!ids.length) return new Map<string, any>();
            const uniqueIds = uniq(ids);
            const results = await self.users.find(
                {_id: {$in: uniqueIds}},
                projection ? {projection} : undefined
            );
            const m = new Map<string, any>();
            for (const user of results) {
                // Use the original string ID as key (before transformation)
                const key = user._id.replace('user_', '');
                m.set(key, user);
            }
            return m;
        };

        const loadCategoriesByIds = async (ids: string[], projection?: Record<string, 0 | 1>) => {
            if (!ids.length) return new Map<string, any>();
            const uniqueIds = uniq(ids);
            const results = await self.categories.find(
                {_id: {$in: uniqueIds}},
                projection ? {projection} : undefined
            );
            const m = new Map<string, any>();
            for (const category of results) {
                // Use the original string ID as key (before transformation)
                const key = category._id.replace('category_', '');
                m.set(key, category);
            }
            return m;
        };

        const loadTagsByIds = async (ids: string[], projection?: Record<string, 0 | 1>) => {
            if (!ids.length) return new Map<string, any>();
            const uniqueIds = uniq(ids);
            const results = await self.tags.find(
                {_id: {$in: uniqueIds}},
                projection ? {projection} : undefined
            );
            const m = new Map<string, any>();
            for (const tag of results) {
                // Use the original string ID as key (before transformation)
                const key = tag._id.replace('tag_', '');
                m.set(key, tag);
            }
            return m;
        };

        const loadMediaByIds = async (ids: string[], projection?: Record<string, 0 | 1>) => {
            if (!ids.length) return new Map<string, any>();
            const uniqueIds = uniq(ids);
            const results = await self.media.find(
                {_id: {$in: uniqueIds}},
                projection ? {projection} : undefined
            );
            const m = new Map<string, any>();
            for (const media of results) {
                // Use the original string ID as key (before transformation)
                const key = media._id.replace('media_', '');
                m.set(key, media);
            }
            return m;
        };

        const loadBlogsByIds = async (ids: string[], projection?: Record<string, 0 | 1>) => {
            if (!ids.length) return new Map<string, any>();
            const uniqueIds = uniq(ids);
            const results = await self.blogs.find(
                {_id: {$in: uniqueIds}},
                projection ? {projection} : undefined
            );
            const m = new Map<string, any>();
            for (const blog of results) {
                // Use the original string ID as key (before transformation)
                const key = blog._id.replace('blog_', '');
                m.set(key, blog);
            }
            return m;
        };

        // ---------- core hydrator (from raw DB rows) ----------
        const hydrateRawBlogs = async (
            rawBlogs: any[],
            projections?: HydratedBlogQueryOptions['projections']
        ): Promise<HydratedBlog[]> => {
            if (!rawBlogs.length) return [];

            // collect all foreign keys (already as ObjectIds from DB)
            const userIds = uniq(rawBlogs.map(b => b.userId?.toString()).filter(truthy));
            const categoryIds = uniq(rawBlogs.map(b => b.categoryId?.toString()).filter(truthy));
            const allTagIds = uniq(rawBlogs.flatMap(b => (b.tagIds || []).map((id: any) => id?.toString())).filter(truthy));
            const mediaIds = uniq(rawBlogs.map(b => b.featuredMediaId?.toString()).filter(truthy));
            const parentIds = uniq(rawBlogs.map(b => b.parentId?.toString()).filter(truthy));

            // extract relationship projections
            const userProjection = projections?.user;
            const categoryProjection = projections?.category;
            const tagProjection = projections?.tag;
            const featuredMediaProjection = projections?.featuredMedia;
            const parentProjection = projections?.parent;

            // batch fetch with projections
            const [usersMap, catsMap, tagsMap, mediaMap, parentsMap] = await Promise.all([
                loadUsersByIds(userIds, userProjection),
                loadCategoriesByIds(categoryIds, categoryProjection),
                loadTagsByIds(allTagIds, tagProjection),
                loadMediaByIds(mediaIds, featuredMediaProjection),
                loadBlogsByIds(parentIds, parentProjection),
            ]);

            // transform + stitch
            const out: HydratedBlog[] = [];
            for (const row of rawBlogs) {
                const blog = this.blogTransformer.fromDb(row);
                const outRow: any = {...blog}
                if (row.userId) {
                    const userKey = row.userId.toString();
                    outRow.user = usersMap.get(userKey); // Already transformed by loadUsersByIds
                }

                if (row.categoryId) {
                    const categoryKey = row.categoryId.toString();
                    outRow.category = catsMap.get(categoryKey); // Already transformed by loadCategoriesByIds
                }

                if (row.tagIds) {
                    outRow.tags = (row.tagIds || [])
                        .map((tid: ObjectId) => {
                            const tagKey = tid.toString();
                            return tagsMap.get(tagKey);
                        })
                        .filter(truthy); // Already transformed by loadTagsByIds
                }

                if (row.featuredMediaId) {
                    const featuredMediaKey = row.featuredMediaId?.toString();
                    outRow.featuredMedia = featuredMediaKey
                        ? mediaMap.get(featuredMediaKey) // Already transformed by loadMediaByIds
                        : undefined;
                }

                if (outRow.parentId) {
                    const parentKey = row.parentId?.toString();
                    outRow.parent = parentKey
                        ? parentsMap.get(parentKey) // Already transformed by loadBlogsByIds
                        : undefined;
                }

                out.push(outRow);
            }
            return out;
        };

        // ---------- query helpers ----------
        // Note: No longer needed since we use collection operations

        // ---------- public API ----------
        return {
            // single delegates to batched-many
            getHydratedBlog: async (filter: Filter<Blog>): Promise<HydratedBlog | null> => {
                const res = await self.generated.getHydratedBlogs(filter, {limit: 1});
                return res[0] ?? null;
            },

            getHydratedBlogs: async (
                filter: Filter<Blog>,
                options?: HydratedBlogQueryOptions
            ): Promise<HydratedBlog[]> => {
                // Extract blog-level projections (exclude relationship projections)
                const blogProjection = options?.projections ?
                    Object.fromEntries(
                        Object.entries(options.projections)
                            .filter(([key]) => !['user', 'category', 'tag', 'featuredMedia', 'parent'].includes(key))
                    ) as Record<string, 0 | 1> : options?.projection;

                // Use the blogs collection operations to get raw data
                const blogs = await self.blogs.find(filter, {
                    ...options,
                    projection: blogProjection
                });

                // Now we need to get the raw DB documents for hydration
                // We have the transformed blogs, need to get back to raw for hydration
                const blogIds = blogs.map(b => oid(b._id));
                if (blogIds.length === 0) return [];

                const blogsCol = this.db.collection('blogs');
                const rawBlogs = await blogsCol.find({_id: {$in: blogIds}}).toArray();

                // Sort raw blogs to match the original order
                const rawBlogMap = new Map(rawBlogs.map(b => [b._id.toString(), b]));
                const sortedRawBlogs = blogIds.map(id => rawBlogMap.get(id.toString())).filter(truthy);

                return hydrateRawBlogs(sortedRawBlogs, options?.projections);
            },

            getRecentBlogs: async (limit: number = 10): Promise<HydratedBlog[]> => {
                return self.generated.getHydratedBlogs(
                    {status: 'published'},
                    {sort: {createdAt: -1}, limit}
                );
            },

            getRelatedBlogs: async (blogId: string, limit: number = 5): Promise<HydratedBlog[]> => {
                const seed = await self.blogs.findById(blogId);
                if (!seed) return [];

                const seedTags: string[] = Array.isArray(seed.tagIds) ? seed.tagIds : [];
                const seedCategoryId: string | undefined = seed.categoryId;

                if (!seedCategoryId && seedTags.length === 0) return [];

                // Get candidates by category
                const categoryBlogs = seedCategoryId
                    ? await self.blogs.find({
                        status: 'published',
                        _id: {$ne: blogId},
                        categoryId: seedCategoryId
                    })
                    : [];

                // Get candidates by tags
                const tagBlogs = seedTags.length > 0
                    ? await self.blogs.find({
                        status: 'published',
                        _id: {$ne: blogId},
                        tagIds: {$in: seedTags} as any
                    })
                    : [];

                // Combine and deduplicate
                const blogMap = new Map<string, Blog>();
                [...categoryBlogs, ...tagBlogs].forEach(blog => {
                    blogMap.set(blog._id, blog);
                });
                const candidates = Array.from(blogMap.values());

                // score in memory
                const scored = candidates.map(b => {
                    let score = 0;
                    if (seedCategoryId && b.categoryId === seedCategoryId) score += 2;
                    const shared = (b.tagIds || []).filter((t: string) => seedTags.includes(t)).length;
                    score += shared;
                    return {b, score};
                }).filter(s => s.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, limit)
                    .map(s => s.b);

                // Now we need to get the raw DB documents for hydration
                const blogIds = scored.map(blog => oid(blog._id));
                if (blogIds.length === 0) return [];

                const blogsCol = this.db.collection('blogs');
                const rawBlogs = await blogsCol.find({_id: {$in: blogIds}}).toArray();

                // Sort raw blogs to match the scored order
                const sortedRawBlogs = blogIds.map(id =>
                    rawBlogs.find(b => b._id.toString() === id.toString())
                ).filter(truthy);

                return hydrateRawBlogs(sortedRawBlogs);
            },

            getHydratedAuthor: async (userId: string): Promise<User | null> => {
                return await self.users.findById(userId);
            },

            getAuthorBlogs: async (
                userId: string,
                options?: HydratedBlogQueryOptions
            ): Promise<HydratedBlog[]> => {
                return self.generated.getHydratedBlogs({userId, status: 'published'}, options);
            },

            getHydratedCategories: async (): Promise<Category[]> => {
                return await self.categories.find({});
            },

            getCategoryWithBlogs: async (
                categoryId: string,
                options?: HydratedBlogQueryOptions
            ): Promise<{ category: Category | null; blogs: HydratedBlog[] }> => {
                const category = await self.categories.findById(categoryId);
                if (!category) return {category: null, blogs: []};
                const blogs = await self.generated.getHydratedBlogs({categoryId, status: 'published'}, options);
                return {category, blogs};
            },

            getHydratedTags: async (): Promise<Tag[]> => {
                return await self.tags.find({});
            },

            getTagWithBlogs: async (
                tagId: string,
                options?: HydratedBlogQueryOptions
            ): Promise<{ tag: Tag | null; blogs: HydratedBlog[] }> => {
                const tag = await self.tags.findById(tagId);
                if (!tag) return {tag: null, blogs: []};
                const blogs = await self.generated.getHydratedBlogs(
                    {status: 'published', tagIds: {$in: [tagId]}},
                    options
                );
                return {tag, blogs};
            },

            getBlogsByTag: async (
                tagSlug: string,
                options?: HydratedBlogQueryOptions
            ): Promise<HydratedBlog[]> => {
                const tag = await self.tags.findOne({slug: tagSlug});
                if (!tag) return [];
                return self.generated.getHydratedBlogs(
                    {status: 'published', tagIds: {$in: [tag._id]}},
                    options
                );
            },

            getBlogsByCategory: async (
                categorySlug: string,
                options?: HydratedBlogQueryOptions
            ): Promise<HydratedBlog[]> => {
                const category = await self.categories.findOne({slug: categorySlug});
                if (!category) return [];
                return self.generated.getHydratedBlogs(
                    {status: 'published', categoryId: category._id},
                    options
                );
            },
        };
    }

    private getCollectionOperations<T extends U, U>(
        collectionName: string,
        transformer: BaseMongoTransformer<T, U>
    ): CollectionOperations<T, U> {
        const collection: Collection<any> = this.db.collection(collectionName);

        return {
            findOne: async (filter: Filter<T>) => {
                const dbFilter = transformer.toDbFilter(filter);
                const result = await collection.findOne(dbFilter);
                return result ? transformer.fromDb(result) : null;
            },

            find: async (filter: Filter<T>, options) => {
                const dbFilter = transformer.toDbFilter(filter);
                let query = collection.find(dbFilter);

                if (options?.projection)
                    query = query.project(options.projection);
                if (options?.sort)
                    query = query.sort(options.sort);
                if (options?.skip)
                    query = query.skip(options.skip);
                if (options?.limit)
                    query = query.limit(options.limit);

                const results = await query.toArray();
                return results.map(result => transformer.fromDb(result));
            },

            count: async (filter: Filter<T>) => {
                const dbFilter = transformer.toDbFilter(filter);
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
                const dbFilter = transformer.toDbFilter(filter);
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
                const dbFilter = transformer.toDbFilter(filter);
                const result = await collection.findOneAndDelete(dbFilter);
                return result ? transformer.fromDb(result) : null;
            },

            delete: async (filter: Filter<T>): Promise<number> => {
                const dbFilter = transformer.toDbFilter(filter);
                const result = await collection.deleteMany(dbFilter);
                return result.deletedCount || 0;
            },
        };
    }
}

export default {}