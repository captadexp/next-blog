import {
    Author,
    AuthorData,
    Blog,
    BlogData,
    Category,
    CategoryData,
    CollectionOperations,
    DatabaseProvider, Filter,
    Tag,
    TagData
} from "../database";
import {MongoClient, Db, Collection, ObjectId} from "mongodb"


export default class MongoDBProvider implements DatabaseProvider {
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

    get authors(): CollectionOperations<Author, AuthorData> {
        return this.getCollectionOperations<Author, AuthorData>('authors');
    }

    private getCollectionOperations<T, U>(collectionName: string): CollectionOperations<T, U> {
        const collection: Collection<any> = this.db.collection(collectionName);

        return {
            findOne: (filter: Filter<T>) => collection.findOne(filter),
            find: async (filter: Filter<T>) => collection.find(filter).toArray(),
            findById: (id: string) => collection.findOne({_id: new ObjectId(id)}),
            create: async (data: U) => {
                const result = await collection.insertOne(data);
                return {_id: result.insertedId.toString(), ...data} as unknown as T;
            },
            updateOne: (filter: Filter<T>, update: Omit<Filter<T>, "_id">) => collection.updateOne(filter, {$set: update}).then(() => undefined),
            deleteOne: (filter: Filter<T>) => collection.deleteOne(filter).then(() => undefined),
        };
    }
}
