import {FileDBAdapter, MongoDBAdapter} from "@supergrowthai/next-blog/adapters";
import {DatabaseAdapter} from "@supergrowthai/next-blog/types";
import {MongoClient} from "mongodb";
import path from "path";
import fs from "fs";

const useMongo = process.env.VERCEL === "1" && Boolean(process.env.MONGO_DB_URL);

let dbProvider: () => Promise<DatabaseAdapter>;

if (useMongo) {
    const mongoUrl = process.env.MONGO_DB_URL!;

    // Cache the client promise across invocations
    const globalAny: any = globalThis;
    if (!globalAny._mongoClientPromise) {
        globalAny._mongoClientPromise = new MongoClient(mongoUrl).connect();
    }
    const clientPromise = globalAny._mongoClientPromise;

    dbProvider = async () => {
        const client = await clientPromise;
        return new MongoDBAdapter("next-blog", client);
    };
    console.log("Using MongoDBAdapter.");
} else {
    // Use FileDBAdapter for local development by default
    const dataPath = path.join(process.cwd(), 'blog-data');
    if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, {recursive: true});
    }
    dbProvider = async () => new FileDBAdapter(`${dataPath}/`);
    console.log("Using FileDBAdapter for local development. Set MONGO_DB_URL to use MongoDB locally.");
}

export {dbProvider};
