import {
    Author,
    AuthorData,
    Blog,
    BlogData,
    Category,
    CategoryData,
    CollectionOperations,
    DatabaseProvider,
    Tag,
    TagData
} from "../database";

type MongoClient = any
type Collection<T> = any

export default class MongoDBProvider implements DatabaseProvider {
    private db: MongoClient['db'];

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
        const collection: Collection<T> = this.db.collection(collectionName);

        return {
            findOne: (filter: Object) => collection.findOne(filter),
            find: async (filter: Object) => collection.find(filter).toArray(),
            // @ts-ignore
            findById: (id: string) => collection.findOne({_id: new ObjectId(id)}),
            create: async (data: U) => {
                const result = await collection.insertOne(data);
                return {_id: result.insertedId.toString(), ...data} as unknown as T;
            },
            updateOne: (filter: Object, update: Object) => collection.updateOne(filter, {$set: update}),
            deleteOne: (filter: Object) => collection.deleteOne(filter),
        };
    }
}
