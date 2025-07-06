import nextBlog from "@supergrowthai/next-blog";
import {FileDBAdapter, MongoDBAdapter} from "@supergrowthai/next-blog/adapters";
import {MongoClient} from "mongodb"
import path from "path";
import fs from "fs";

let dbProvider;

if(process.env.VERCEL_DEMO==='true'){
    //Using fileDBAdapter for vercel demo
    const dataPath = path.join(process.cwd(), 'blog-data');
    if(!fs.existsSync(dataPath)){
        fs.mkdirSync(dataPath,{recursive:true});
    }
    dbProvider = async () => new FileDBAdapter(`${dataPath}/`);
}else{
    //using MongoDB adapters for other environment
    const mongoDbUrl = process.env.MONGO_DB_URL;
    if(!mongoDbUrl){
        throw new Error('MONGODB_URL environment variable is not set');
    }
    const client = new MongoClient(mongoDbUrl);
    const ClientPromise = client.connect();
    dbProvider = async() => {
        const client = await ClientPromise;
        const dbName = new URL(mongoDbUrl).pathname.substring(1) || 'next-blog';
        return new MongoDBAdapter(dbName, client);
    }
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