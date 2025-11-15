import {MongoClient} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server';

let mongod: MongoMemoryServer | null = null;
let client: MongoClient | null = null;

export async function setupTestDb() {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    client = new MongoClient(uri);
    await client.connect();
    return {client, mongod};
}

export async function teardownTestDb() {
    if (client) {
        await client.close();
    }
    if (mongod) {
        await mongod.stop();
    }
}

export async function clearDatabase(client: MongoClient, dbName: string) {
    const db = client.db(dbName);
    const collections = await db.collections();
    for (const collection of collections) {
        await collection.deleteMany({});
    }
}