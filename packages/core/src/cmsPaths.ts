import {CNextRequest} from "./utils/secureInternal.js";
import {PathObject} from "./utils/parse-path.js";
import secure from "./utils/secureInternal.js";
import {handleStaticFileRequest} from "./utils/staticFileHandler.js";
import {DashboardPage} from "@supergrowthai/next-blog-dashboard"
import {
    getBlogs, getBlogById, createBlog, updateBlog, deleteBlog,
    getCategories, getCategoryById, createCategory, updateCategory, deleteCategory,
    getTags, getTagById, createTag, updateTag, deleteTag,
    getConfig, getCurrentUser,
    listUsers, getUser, createUser, updateUser, deleteUser,
    getSettings, getSettingById, createSetting, updateSetting, deleteSetting,
    getPlugins, getPluginById, createPlugin, updatePlugin, deletePlugin,
    getPluginHookMappings, getPluginHookMappingById, createPluginHookMapping, updatePluginHookMapping, deletePluginHookMapping
} from "./api/index.js";

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
            },
            settings: {
                '*': getSettings,
                ':id': getSettingById
            },
            plugins: {
                '*': getPlugins,
                ':id': getPluginById,
                ':pluginId': {
                    'hooks': getPluginHookMappings
                }
            },
            'plugin-hooks': {
                '*': getPluginHookMappings,
                ':id': getPluginHookMappingById
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
            setting: {
                ':id': {
                    update: updateSetting,
                    delete: deleteSetting
                }
            },
            settings: {
                create: createSetting
            },
            plugin: {
                ':id': {
                    update: updatePlugin,
                    delete: deletePlugin
                }
            },
            plugins: {
                create: createPlugin
            },
            'plugin-hook': {
                ':id': {
                    update: updatePluginHookMapping,
                    delete: deletePluginHookMapping
                }
            },
            'plugin-hooks': {
                create: createPluginHookMapping
            },
        }
    }
};
export default cmsPaths
