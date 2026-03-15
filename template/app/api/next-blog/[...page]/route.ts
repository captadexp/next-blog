import {nextBlog} from "@supergrowthai/next-blog/next";
import nextBlogConfig from "../../../../lib/next-blog-config";


// Initialize Next-Blog
const {GET, POST} = nextBlog(nextBlogConfig());

// Export the route handlers
export {GET, POST};
