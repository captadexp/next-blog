import * as adapters from "@supergrowthai/next-blog/adapters";
import type {DatabaseAdapter} from "@supergrowthai/next-blog";
import {MongoClient} from "mongodb";
import {createAdminUser} from "./createAdmin";
import crypto from "crypto";

// Auto-generate a SESSION_SECRET if one isn't provided
if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = crypto.randomBytes(32).toString("hex");
}

const mongoUrl = process.env.MONGODB_URI;
const useMongo = Boolean(mongoUrl);

let dbProvider: () => Promise<DatabaseAdapter>;
if (mongoUrl) {
    // Cache the client promise across invocations
    const globalAny: any = globalThis;
    if (!globalAny._mongoClientPromise) {
        globalAny._mongoClientPromise = new MongoClient(mongoUrl).connect();
    }
    const clientPromise = globalAny._mongoClientPromise;

    let adminCreatedPromise: Promise<void> | null = null;

    dbProvider = async () => {
        const client = await clientPromise;
        const db = new adapters.MongoDBAdapter("next-blog", client);

        if(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD ) {
            if (!adminCreatedPromise) {
                adminCreatedPromise = createAdminUser(db);
            }
            await adminCreatedPromise;
        }

        return db;
    };
    console.log("Using MongoDBAdapter.");

}else {
    dbProvider = async () => {
        throw new Error("Database not configured. Please set MONGODB_URI in your environment variables.");
    };
    console.warn("Database not configured.");
}
export { dbProvider };
