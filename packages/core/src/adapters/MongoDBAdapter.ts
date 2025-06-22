import {
    Blog,
    BlogData,
    Category,
    CategoryData,
    CollectionOperations,
    DatabaseAdapter, Filter, Permission,
    SettingsEntry,
    SettingsEntryData,
    Tag,
    TagData,
    User,
    UserData
} from "../types.js";
import {MongoClient, Db, Collection, ObjectId} from "mongodb"

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

export default class MongoDBAdapter implements DatabaseAdapter {
    private db: Db;
    private readonly blogTransformer: BlogTransformer;
    private readonly categoryTransformer: CategoryTransformer;
    private readonly tagTransformer: TagTransformer;
    private readonly userTransformer: UserTransformer;
    private readonly settingsTransformer: SettingsTransformer;

    constructor(dbName: string, client: MongoClient) {
        this.db = client.db(dbName);
        this.blogTransformer = new BlogTransformer();
        this.categoryTransformer = new CategoryTransformer();
        this.tagTransformer = new TagTransformer();
        this.userTransformer = new UserTransformer();
        this.settingsTransformer = new SettingsTransformer();
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
            }
        };
    }

    get settings(): CollectionOperations<SettingsEntry, SettingsEntryData> {
        return this.getCollectionOperations<SettingsEntry, SettingsEntryData>('settings', this.settingsTransformer);
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
        };
    }
}
