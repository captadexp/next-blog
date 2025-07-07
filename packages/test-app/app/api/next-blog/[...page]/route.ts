import nextBlog from "@supergrowthai/next-blog";
import {FileDBAdapter, MongoDBAdapter} from "@supergrowthai/next-blog/adapters";
import {MongoClient} from "mongodb"
import path from "path";
import fs from "fs";

let dbProvider;

if (process.env.VERCEL === '1' || process.env.MONGO_DB_URL) {
    // Use MongoDBAdapter on Vercel or when MONGO_DB_URL is set locally
    const mongoDbUrl = process.env.MONGO_DB_URL;
    if (!mongoDbUrl) {
        throw new Error('MONGO_DB_URL environment variable is not set for this environment.');
    }
    const client = new MongoClient(mongoDbUrl);
    const clientPromise = client.connect();
    dbProvider = async () => {
        const client = await clientPromise;
        const dbName = 'next-blog';
        return new MongoDBAdapter(dbName, client);
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

// Initialize Next-Blog
const {GET, POST} = nextBlog({
    db: dbProvider,
    ui: {
        branding: {
            name: "Amazing 1oh1",
            description: "The best directory website"
        }
    }
});

// Export the route handlers
export {GET, POST};