import secure, {CNextRequest} from "./utils/secureInternal.js";
import {PathObject} from "./utils/parse-path.js";
import {handleStaticFileRequest} from "./utils/staticFileHandler.js";
import {DashboardPage} from "@supergrowthai/next-blog-dashboard";

import {
    createBlog,
    createCategory,
    createPlugin,
    createSetting,
    createTag,
    createUser,
    deleteBlog,
    deleteCategory,
    deletePlugin,
    deletePluginSetting,
    deleteSetting,
    deleteTag,
    deleteUser,
    executePluginRpc,
    getBlogById,
    getBlogs,
    getCategories,
    getCategoryById,
    getConfig,
    getCurrentUser,
    getPluginById,
    getPluginHookMappings,
    getPlugins,
    getPluginSetting,
    getPluginSettings,
    getSettingById,
    getSettings,
    getTagById,
    getTags,
    getUser,
    listUsers,
    reinstallPlugin,
    setPluginSetting,
    updateBlog,
    updateBlogMetadata,
    updateCategory,
    updateSetting,
    updateTag,
    updateUser
} from "./api/index.js";

const cmsPaths: { GET: PathObject, POST: PathObject } = {
    GET: {
        api: {
            blogs: {
                '*': getBlogs,
                ':id': getBlogById
            },
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
                ':id': getPluginById
            },
            'plugin-hooks': {
                '*': getPluginHookMappings
            },
            plugin: {
                ':pluginId': {
                    settings: {
                        '*': getPluginSettings,
                        ':key': getPluginSetting
                    }
                }
            }
        },
        dashboard: {
            '[...]': secure(DashboardPage.toString),
            static: {
                '[...]': async (request: CNextRequest) => {
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
                    delete: deleteBlog,
                    'update-metadata': updateBlogMetadata
                },
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
                    delete: deletePlugin,
                    reinstall: reinstallPlugin
                },
                ':pluginId': {
                    settings: {
                        ':key': {
                            set: setPluginSetting,
                            delete: deletePluginSetting
                        }
                    }
                },
                rpc: {
                    ':rpcName': executePluginRpc
                }
            },
            plugins: {
                create: createPlugin
            }
        }
    }
};
export default cmsPaths
