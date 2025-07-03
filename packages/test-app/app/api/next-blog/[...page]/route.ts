import nextBlog from "@supergrowthai/next-blog";
import path from "path";
import fs from "fs";
import {FileDBAdapter} from "@supergrowthai/next-blog/adapters";

// Create a data directory for our file-based database
const dataPath = process.env.NEXT_BLOG_DATA_PATH || path.join(process.cwd(), "blog-data");

// Ensure the data directory exists
if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, {recursive: true});
}

// Initialize the FileDBAdapter
const dbProvider = async () => new FileDBAdapter(`${dataPath}/`);

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