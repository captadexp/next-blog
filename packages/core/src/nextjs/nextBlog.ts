import {Configuration} from "@supergrowthai/next-blog-types/server";
import {BasicAuthHandler} from "../auth/basic-auth-handler.ts";
import {wrapPathObject} from "../utils/withExtras.ts";
import cmsPaths from "../cmsPaths.ts";
import {createNextJSRouter} from "@supergrowthai/oneapi/nextjs";
import pluginExecutor from "../plugins/plugin-executor.server.ts";
import {initializeSystem} from "../utils/defaultSettings.ts";

/**
 * Main CMS function that creates the API route handlers
 */
const nextBlog = function (configuration: Configuration) {
    const {pathPrefix = "/api/next-blog/"} = configuration;

    // Create auth handler
    const authHandler = new BasicAuthHandler(configuration.db);

    const wrappedPaths = wrapPathObject(configuration, cmsPaths);

    // Create a single router for all methods
    const router = createNextJSRouter(wrappedPaths, {
        pathPrefix,
        authHandler,
        createApiImpl: async ({request, session, response}) => {
            // Initialize database and plugins
            const db = await configuration.db();
            await pluginExecutor.initialize(db);

            // Initialize system components (user and plugin)
            await initializeSystem(db);

            return {
                db: configuration.db,
                configuration
            };
        }
    });

    // Return all the handlers from the single router
    return router.handlers();
};

export {nextBlog};