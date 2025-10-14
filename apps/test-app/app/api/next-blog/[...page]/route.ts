import {nextBlog} from "@supergrowthai/next-blog/next";
import {dbProvider} from "@/lib/db";


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
