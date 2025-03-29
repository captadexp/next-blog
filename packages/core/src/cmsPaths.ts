import {CNextRequest} from "./types";
import {PathObject} from "./utils/parse-path";
import secure from "./utils/secureInternal";
import {handleStaticFileRequest} from "./utils/staticFileHandler";
import {DashboardPage} from "@supergrowthai/next-blog-dashboard/server"
import {
    getBlogs, getBlogById, createBlog, updateBlog, deleteBlog,
    getCategories, getCategoryById, createCategory, updateCategory, deleteCategory,
    getTags, getTagById, createTag, updateTag, deleteTag,
    getConfig, getCurrentUser,
    listUsers, getUser, createUser, updateUser, deleteUser
} from "./api";

const cmsPaths: { GET: PathObject, POST: PathObject } = {
    GET: {
        api: {
            blogs: {
                '*': getBlogs,
                ':id': getBlogById
            },
            // authors routes removed - using users instead
            categories: {
                '*': getCategories,
                ':id': getCategoryById
            },
            tags: {
                '*': getTags,
                ':id': getTagById
            },
            users: {
                '*': listUsers,
                ':id': getUser
            },
            config: {
                '*': getConfig
            },
            me: {
                '*': getCurrentUser
            }
        },
        dashboard: {
            '*': secure(DashboardPage.toString),
            static: {
                '*': async (request: CNextRequest) => {
                    return handleStaticFileRequest(request, '*');
                }
            },
        }
    },
    POST: {
        api: {
            blog: {
                ':id': {
                    update: updateBlog,
                    delete: deleteBlog
                }
            },
            blogs: {
                create: createBlog
            },
            category: {
                ':id': {
                    update: updateCategory,
                    delete: deleteCategory
                }
            },
            categories: {
                create: createCategory
            },
            tag: {
                ':id': {
                    update: updateTag,
                    delete: deleteTag
                }
            },
            tags: {
                create: createTag
            },
            // author routes removed - using users instead
            user: {
                ':id': {
                    update: updateUser,
                    delete: deleteUser
                }
            },
            users: {
                create: createUser
            },
        }
    }
};
export default cmsPaths
