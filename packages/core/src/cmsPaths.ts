import type {OneApiFunction, PathObject} from "@supergrowthai/oneapi";
import {DashboardPage} from "@supergrowthai/next-blog-dashboard";
import {
    createBlog,
    createCategory,
    createMedia,
    createPlugin,
    createSetting,
    createTag,
    createUser,
    cron5Minute,
    cronDaily,
    cronHourly,
    deleteBlog,
    deleteCategory,
    deleteMedia,
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
    getMedia,
    getMediaById,
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
    login,
    logout,
    reinstallPlugin,
    setPluginSetting,
    updateBlog,
    updateBlogMetadata,
    updateCategory,
    updateMedia,
    updateSetting,
    updateTag,
    updateUser,
    uploadMedia
} from "./api";
import {handleStaticFileRequest} from "./utils/staticFileHandler.js";

// Helper to create method-aware handlers
function methodHandler(handlers: {
    GET?: OneApiFunction;
    POST?: OneApiFunction;
    DELETE?: OneApiFunction;
    PUT?: OneApiFunction;
    PATCH?: OneApiFunction;
}): OneApiFunction {
    return async (session, request, extra) => {
        const handler = handlers[request.method as keyof typeof handlers];
        if (!handler) {
            return {code: 405, message: 'Method not allowed'};
        }
        return handler(session, request, extra);
    };
}

const cmsPaths: PathObject = {
    api: {
        login: methodHandler({POST: login}),
        logout: methodHandler({POST: logout}),
        blogs: {
            '*': methodHandler({GET: getBlogs}),
            ':id': methodHandler({GET: getBlogById}),
            create: methodHandler({POST: createBlog})
        },
        blog: {
            ':id': {
                update: methodHandler({POST: updateBlog}),
                delete: methodHandler({POST: deleteBlog}),
                'update-metadata': methodHandler({POST: updateBlogMetadata})
            }
        },
        categories: {
            '*': methodHandler({GET: getCategories}),
            ':id': methodHandler({GET: getCategoryById}),
            create: methodHandler({POST: createCategory})
        },
        category: {
            ':id': {
                update: methodHandler({POST: updateCategory}),
                delete: methodHandler({POST: deleteCategory})
            }
        },
        tags: {
            '*': methodHandler({GET: getTags}),
            ':id': methodHandler({GET: getTagById}),
            create: methodHandler({POST: createTag})
        },
        tag: {
            ':id': {
                update: methodHandler({POST: updateTag}),
                delete: methodHandler({POST: deleteTag})
            }
        },
        users: {
            '*': methodHandler({GET: listUsers}),
            ':id': methodHandler({GET: getUser}),
            create: methodHandler({POST: createUser})
        },
        user: {
            ':id': {
                update: methodHandler({POST: updateUser}),
                delete: methodHandler({POST: deleteUser})
            }
        },
        config: {
            '*': methodHandler({GET: getConfig})
        },
        me: {
            '*': methodHandler({GET: getCurrentUser})
        },
        settings: {
            '*': methodHandler({GET: getSettings}),
            ':id': methodHandler({GET: getSettingById}),
            create: methodHandler({POST: createSetting})
        },
        setting: {
            ':id': {
                update: methodHandler({POST: updateSetting}),
                delete: methodHandler({POST: deleteSetting})
            }
        },
        plugins: {
            '*': methodHandler({GET: getPlugins}),
            ':id': methodHandler({GET: getPluginById}),
            create: methodHandler({POST: createPlugin})
        },
        'plugin-hooks': {
            '*': methodHandler({GET: getPluginHookMappings})
        },
        plugin: {
            ':id': {
                delete: methodHandler({POST: deletePlugin}),
                reinstall: methodHandler({POST: reinstallPlugin})
            },
            ':pluginId': {
                settings: {
                    '*': methodHandler({GET: getPluginSettings}),
                    ':key': {
                        '*': methodHandler({GET: getPluginSetting}),
                        set: methodHandler({POST: setPluginSetting}),
                        delete: methodHandler({POST: deletePluginSetting})
                    }
                }
            },
            rpc: {
                ':rpcName': methodHandler({POST: executePluginRpc})
            }
        },
        cron: {
            '5-min': methodHandler({GET: cron5Minute}),
            'hourly': methodHandler({GET: cronHourly}),
            'daily': methodHandler({GET: cronDaily})
        },
        media: {
            '*': methodHandler({GET: getMedia}),
            ':id': methodHandler({GET: getMediaById, POST: updateMedia}),
            'create': methodHandler({POST: createMedia}),
            'upload': {
                ':mediaId': uploadMedia
            },
            delete: {
                ':id': methodHandler({POST: deleteMedia})
            }
        }
    },
    dashboard: {
        '[...]': methodHandler({
            GET: async (session, request, extra) => {
                return new Response(DashboardPage.toString(), {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8'
                    }
                });
            }
        }),
        static: {
            '[...]': methodHandler({
                GET: handleStaticFileRequest
            })
        }
    }
};

export default cmsPaths;