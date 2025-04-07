import {
    Blog,
    BlogData,
    Category,
    CategoryData,
    CollectionOperations,
    DatabaseProvider, Filter,
    Tag,
    TagData,
    User,
    UserData
} from "../types.js";
import {MongoClient, Db, Collection, ObjectId} from "mongodb"


export default class MongoDBAdapter implements DatabaseProvider {
    private db: Db;

    constructor(dbName: string, client: MongoClient) {
        this.db = client.db(dbName);
    }

    get blogs(): CollectionOperations<Blog, BlogData> {
        return this.getCollectionOperations<Blog, BlogData>('blogs');
    }

    get categories(): CollectionOperations<Category, CategoryData> {
        return this.getCollectionOperations<Category, CategoryData>('categories');
    }

    get tags(): CollectionOperations<Tag, TagData> {
        return this.getCollectionOperations<Tag, TagData>('tags');
    }

    // Authors functionality moved to users

    get users(): CollectionOperations<User, UserData> {
        const collection: Collection<any> = this.db.collection('users');
        const standardOps = this.getCollectionOperations<User, UserData>('users');
        
        return {
            ...standardOps,
            create: async (data: UserData) => {
                const users = await collection.find({}).toArray();
                const isFirstUser = users.length === 0;
                
                // Set default permissions for the first user (admin access)
                const permissions = isFirstUser 
                    ? ['all:all'] 
                    : data.permissions || [];
                
                const userData = {
                    ...data,
                    permissions,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                
                const result = await collection.insertOne(userData);
                return { _id: result.insertedId.toString(), ...userData } as unknown as User;
            },
            updateOne: (filter: Filter<User>, update: Omit<Filter<User>, "_id">) => {
                const updatedData = {
                    ...update,
                    updatedAt: Date.now()
                };
                return collection.findOneAndUpdate(filter, { $set: updatedData }, { returnDocument: "after" });
            }
        };
    }

    private getCollectionOperations<T, U>(collectionName: string): CollectionOperations<T, U> {
        const collection: Collection<any> = this.db.collection(collectionName);

        return {
            findOne: (filter: Filter<T>) => collection.findOne(filter),
            find: async (filter: Filter<T>, options) => {
                let query = collection.find(filter)
                if (options?.skip)
                    query = query.skip(options?.skip)
                if (options?.limit)
                    query = query.limit(options?.limit)

                return query.toArray()
            },
            findById: (id: string) => collection.findOne({_id: new ObjectId(id)}),
            create: async (data: U) => {
                const result = await collection.insertOne(data);
                return {_id: result.insertedId.toString(), ...data} as unknown as T;
            },
            updateOne: (filter: Filter<T>, update: Omit<Filter<T>, "_id">) => collection.findOneAndUpdate(filter, {$set: update}, {returnDocument: "after"}),
            deleteOne: (filter: Filter<T>) => collection.findOneAndDelete(filter),
        };
    }
}
