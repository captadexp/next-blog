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

        // ---------- low-level collection handles ----------
        const blogsCol = () => this.db.collection('blogs') as Collection<any>;
        const usersCol = () => this.db.collection('users') as Collection<any>;
        const catsCol = () => this.db.collection('categories') as Collection<any>;
        const tagsCol = () => this.db.collection('tags') as Collection<any>;
        const mediaCol = () => this.db.collection('media') as Collection<any>;

        // ---------- tiny utils ----------
        const uniq = <T>(xs: T[]) => Array.from(new Set(xs));
        const truthy = <T>(x: T | null | undefined): x is T => !!x;

        const indexById = <T extends { _id: ObjectId }>(rows: T[]) => {
            const m = new Map<string, T>();
            for (const r of rows) {
                const key = r._id.toString();
                m.set(key, r);
            }
            return m;
        };

        // ---------- swappable loaders (cache-ready) ----------
        const loadUsersByIds = async (ids: string[], projection?: Record<string, 0 | 1>) => {
            if (!ids.length) return new Map<string, any>();
            let query = usersCol().find({_id: {$in: uniq(ids)}});
            if (projection) query = query.project(projection);
            const rows = await query.toArray();
            return indexById(rows);
        };

        const loadCategoriesByIds = async (ids: string[], projection?: Record<string, 0 | 1>) => {
            if (!ids.length) return new Map<string, any>();
            let query = catsCol().find({_id: {$in: uniq(ids)}});
            if (projection) query = query.project(projection);
            const rows = await query.toArray();
            return indexById(rows);
        };

        const loadTagsByIds = async (ids: string[], projection?: Record<string, 0 | 1>) => {
            if (!ids.length) return new Map<string, any>();
            let query = tagsCol().find({_id: {$in: uniq(ids)}});
            if (projection) query = query.project(projection);
            const rows = await query.toArray();
            return indexById(rows);
        };

        const loadMediaByIds = async (ids: string[], projection?: Record<string, 0 | 1>) => {
            if (!ids.length) return new Map<string, any>();
            let query = mediaCol().find({_id: {$in: uniq(ids)}});
            if (projection) query = query.project(projection);
            const rows = await query.toArray();
            return indexById(rows);
        };

        const loadBlogsByIds = async (ids: string[], projection?: Record<string, 0 | 1>) => {
            if (!ids.length) return new Map<string, any>();
            let query = blogsCol().find({_id: {$in: uniq(ids)}});
            if (projection) query = query.project(projection);
            const rows = await query.toArray();
            return indexById(rows);
        };

        // ---------- core hydrator (from raw DB rows) ----------
        const hydrateRawBlogs = async (
            rawBlogs: any[],
            projections?: HydratedBlogQueryOptions['projections']
        ): Promise<HydratedBlog[]> => {
            if (!rawBlogs.length) return [];

            // collect all foreign keys
            const userIds = uniq(rawBlogs.map(b => b.userId).filter(truthy));
            const categoryIds = uniq(rawBlogs.map(b => b.categoryId).filter(truthy));
            const allTagIds = uniq(rawBlogs.flatMap(b => (b.tagIds || [])).filter(truthy));
            const mediaIds = uniq(rawBlogs.map(b => b.featuredMediaId).filter(truthy));
            const parentIds = uniq(rawBlogs.map(b => b.parentId).filter(truthy));

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
                const userKey = row.userId.toString();
                const categoryKey = row.categoryId.toString();

                const dbUser = usersMap.get(userKey);
                const dbCat = catsMap.get(categoryKey);
                if (!dbUser || !dbCat) continue; // skip incomplete

                const blog = this.blogTransformer.fromDb(row);
                const user = this.userTransformer.fromDb(dbUser);
                const category = this.categoryTransformer.fromDb(dbCat);
                const tags = (row.tagIds || [])
                    .map((tid: ObjectId) => {
                        const tagKey = tid.toString();
                        return tagsMap.get(tagKey);
                    })
                    .filter(truthy)
                    .map((t: Tag) => this.tagTransformer.fromDb(t));

                const featuredMediaKey = row.featuredMediaId?.toString();
                const featuredMedia = featuredMediaKey
                    ? (mediaMap.get(featuredMediaKey) ? this.mediaTransformer.fromDb(mediaMap.get(featuredMediaKey)) : undefined)
                    : undefined;

                const parentKey = row.parentId?.toString();
                const parent = parentKey
                    ? (parentsMap.get(parentKey) ? this.blogTransformer.fromDb(parentsMap.get(parentKey)) : undefined)
                    : undefined;

                out.push({
                    ...blog,
                    user,
                    category,
                    tags,
                    featuredMedia,
                    parent,
                } as HydratedBlog);
            }
            return out;
        };

        // ---------- query helpers ----------
        const applyFindOptions = (cursor: any, options?: {
            skip?: number;
            limit?: number;
            sort?: Record<string, 1 | -1>;
            projection?: Record<string, 0 | 1>;
        }) => {
            if (!options) return cursor;
            if (options.projection) cursor = cursor.project(options.projection);
            if (options.sort) cursor = cursor.sort(options.sort);
            if (typeof options.skip === 'number') cursor = cursor.skip(options.skip);
            if (typeof options.limit === 'number') cursor = cursor.limit(options.limit);
            return cursor;
        };

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
                const dbFilter = this.blogTransformer.toDb(filter);
                let cursor = blogsCol().find(dbFilter);

                // Extract blog-level projections (exclude relationship projections)
                const blogProjection = options?.projections ?
                    Object.fromEntries(
                        Object.entries(options.projections)
                            .filter(([key]) => !['user', 'category', 'tag', 'featuredMedia', 'parent'].includes(key))
                    ) as Record<string, 0 | 1> : options?.projection;

                // Apply query options including blog-level projections
                cursor = applyFindOptions(cursor, {
                    ...options,
                    projection: blogProjection
                });

                const raw = await cursor.toArray();
                return hydrateRawBlogs(raw, options?.projections);
            },

            getRecentBlogs: async (limit: number = 10): Promise<HydratedBlog[]> => {
                return self.generated.getHydratedBlogs(
                    {status: 'published'},
                    {sort: {createdAt: -1}, limit}
                );
            },

            getRelatedBlogs: async (blogId: string, limit: number = 5): Promise<HydratedBlog[]> => {
                const seed = await blogsCol().findOne({_id: blogId});
                if (!seed) return [];

                const seedTags: string[] = Array.isArray(seed.tagIds) ? seed.tagIds : [];
                const seedCategoryId: string | undefined = seed.categoryId;

                // prefilter server-side (but no aggregation): category OR overlapping tagIds
                const query: any = {
                    status: 'published',
                    _id: {$ne: blogId},
                    $or: [
                        {categoryId: seedCategoryId},
                        {tagIds: {$in: seedTags}},
                    ],
                };

                const candidates = await blogsCol().find(query).toArray();

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

                return hydrateRawBlogs(scored);
            },

            getHydratedAuthor: async (userId: string): Promise<User | null> => {
                const raw = await usersCol().findOne({_id: userId});
                return raw ? this.userTransformer.fromDb(raw) : null;
            },

            getAuthorBlogs: async (
                userId: string,
                options?: HydratedBlogQueryOptions
            ): Promise<HydratedBlog[]> => {
                return self.generated.getHydratedBlogs({userId, status: 'published'}, options);
            },

            getHydratedCategories: async (): Promise<Category[]> => {
                const rows = await catsCol().find({}).toArray();
                return rows.map((c: any) => this.categoryTransformer.fromDb(c));
            },

            getCategoryWithBlogs: async (
                categoryId: string,
                options?: HydratedBlogQueryOptions
            ): Promise<{ category: Category | null; blogs: HydratedBlog[] }> => {
                const raw = await catsCol().findOne({_id: categoryId});
                if (!raw) return {category: null, blogs: []};
                const blogs = await self.generated.getHydratedBlogs({categoryId, status: 'published'}, options);
                return {category: this.categoryTransformer.fromDb(raw), blogs};
            },

            getHydratedTags: async (): Promise<Tag[]> => {
                const rows = await tagsCol().find({}).toArray();
                return rows.map((t: any) => this.tagTransformer.fromDb(t));
            },

            getTagWithBlogs: async (
                tagId: string,
                options?: HydratedBlogQueryOptions
            ): Promise<{ tag: Tag | null; blogs: HydratedBlog[] }> => {
                const raw = await tagsCol().findOne({_id: tagId});
                if (!raw) return {tag: null, blogs: []};
                const blogs = await self.generated.getHydratedBlogs(
                    {status: 'published', tagIds: {$in: [tagId]}},
                    options
                );
                return {tag: this.tagTransformer.fromDb(raw), blogs};
            },

            getBlogsByTag: async (
                tagSlug: string,
                options?: HydratedBlogQueryOptions
            ): Promise<HydratedBlog[]> => {
                const raw = await tagsCol().findOne({slug: tagSlug});
                if (!raw) return [];
                return self.generated.getHydratedBlogs(
                    {status: 'published', tagIds: {$in: [raw._id]}},
                    options
                );
            },

            getBlogsByCategory: async (
                categorySlug: string,
                options?: HydratedBlogQueryOptions
            ): Promise<HydratedBlog[]> => {
                const raw = await catsCol().findOne({slug: categorySlug});
                if (!raw) return [];
                return self.generated.getHydratedBlogs(
                    {status: 'published', categoryId: raw._id},
                    options
                );
            },
        };
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