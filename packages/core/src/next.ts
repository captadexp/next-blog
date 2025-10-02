import {createNextJSRouter} from "@supergrowthai/oneapi/nextjs";
import type {Configuration} from "@supergrowthai/types/server";
import {BasicAuthHandler} from "./auth/basic-auth-handler.js";
import cmsPaths from "./cmsPaths.js";
import {initializeDefaultSettings} from "./utils/defaultSettings.js";
import pluginExecutor from "./plugins/plugin-executor.server.js";
import {ServerSettingsHelper} from "./plugins/settings-helper.server.js";
import {wrapPathObject} from "./utils/withExtras.js";

/**
 * Main CMS function that creates the API route handlers
 */
const nextBlog = function (configuration: Configuration) {
    // Create auth handler
    const authHandler = new BasicAuthHandler(configuration.db);

    const wrappedPaths = wrapPathObject(configuration, cmsPaths);

    // Create a single router for all methods
    const router = createNextJSRouter(wrappedPaths, {
        pathPrefix: "/api/next-blog/",
        authHandler,
        createApiImpl: async ({request, session, response}) => {
            // Initialize database and plugins
            const db = await configuration.db();
            await pluginExecutor.initialize(db);

            // Initialize default settings with system settings helper
            const systemSettings = new ServerSettingsHelper('system', db);
            await initializeDefaultSettings(systemSettings);

            return {
                db: configuration.db,
                configuration
            };
        }
    });

    // Return all the handlers from the single router
    return router.handlers();
};

export default nextBlog;