import {createNextJSRouter, IAuthHandler} from "@supergrowthai/oneapi/nextjs";
import {initializeSystem} from "./defaultSettings.js";
import pluginExecutor from "../plugins/plugin-executor.server.js";
import {Configuration} from "@supergrowthai/next-blog-types/server";
import {OneApiFunction} from "@supergrowthai/oneapi";
import {wrapPathObject} from "./withExtras.ts";
import {SessionAuthHandler} from "../auth/SessionAuthHandler.ts";
import {SessionManager} from "../auth/sessions.ts";
import {BasicAuthHandler} from "../auth/basic-auth-handler.ts";
import {DisabledCacheProvider} from "memoose-js";

/**
 * Creates a Next.js router for a single API endpoint
 * Useful for creating standalone route handlers that need full Next-Blog infrastructure
 */
export function createSingleEndpointNextJSRouter(apiFunction: OneApiFunction, {pathPrefix = ""} = {}) {
    return (configuration: Configuration) => {
        const {db: dbProvider, sessionStore} = configuration;
        // Create a simple path object with just the root endpoint
        const pathObject = wrapPathObject({db: dbProvider}, {
            '*': apiFunction,
            '[...]': apiFunction,
        });
        configuration.cacheProvider = configuration.cacheProvider || (async () => new DisabledCacheProvider())


        const authHandler: IAuthHandler<any, any, any> = sessionStore ? new SessionAuthHandler(configuration.db, new SessionManager(sessionStore)) : new BasicAuthHandler(configuration.db);

        // Create router
        const router = createNextJSRouter(pathObject, {
            pathPrefix,
            authHandler,
            createApiImpl: async ({request, session, response}) => {
                // Initialize database and plugins
                const db = await dbProvider();
                await pluginExecutor.initialize(db);

                // Initialize system components
                await initializeSystem(db);

                return {
                    db: dbProvider,
                    configuration: {db: dbProvider}
                };
            }
        });

        return router.handlers();
    };
}