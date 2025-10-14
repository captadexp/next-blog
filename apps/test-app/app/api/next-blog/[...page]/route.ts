import {nextBlog} from "@supergrowthai/next-blog/next";
import type {nextBlog as NextBlogType} from "@supergrowthai/next-blog";
import {dbProvider} from "@/lib/db";

const typedNextBlog = nextBlog as typeof NextBlogType;

// Initialize Next-Blog
const {GET, POST} = typedNextBlog({
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
