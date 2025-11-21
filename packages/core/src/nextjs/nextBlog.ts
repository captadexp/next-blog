import {Configuration} from "@supergrowthai/next-blog-types/server";
import {wrapPathObject} from "../utils/withExtras.ts";
import cmsPaths from "../cmsPaths.ts";
import {createNextJSRouter, IAuthHandler, NextJSHandlers} from "@supergrowthai/oneapi/nextjs";
import pluginExecutor from "../plugins/plugin-executor.server.ts";
import {initializeSystem} from "../utils/defaultSettings.ts";
import {SessionAuthHandler} from "../auth/SessionAuthHandler.ts";
import {DisabledCacheProvider} from "memoose-js";
import {SessionManager} from "../auth/sessions.ts";
import {BasicAuthHandler} from "../auth/basic-auth-handler.ts";

/**
 * Main CMS function that creates the API route handlers
 */
const nextBlog = function (configuration: Configuration): NextJSHandlers {
    const {pathPrefix, sessionStore} = configuration;

    configuration.cacheProvider = configuration.cacheProvider || (async () => new DisabledCacheProvider())

    if (!!pathPrefix) {
        throw new Error("Custom path prefix not supported. Create an issue to request this feature on priority");
    }

    const authHandler: IAuthHandler<any, any, any> = sessionStore ? new SessionAuthHandler(configuration.db, new SessionManager(sessionStore)) : new BasicAuthHandler(configuration.db);

    const wrappedPaths = wrapPathObject(configuration, cmsPaths);

    // Create a single router for all methods
    const router = createNextJSRouter(wrappedPaths, {
        pathPrefix: "/api/next-blog/",
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