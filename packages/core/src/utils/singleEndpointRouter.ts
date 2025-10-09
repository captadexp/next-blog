import {createNextJSRouter} from "@supergrowthai/oneapi/nextjs";
import {BasicAuthHandler} from "../auth/basic-auth-handler.js";
import {initializeSystem} from "./defaultSettings.js";
import pluginExecutor from "../plugins/plugin-executor.server.js";
import {DatabaseAdapter} from "@supergrowthai/types/server";
import {OneApiFunction} from "@supergrowthai/oneapi";
import {wrapPathObject} from "./withExtras.ts";

/**
 * Creates a Next.js router for a single API endpoint
 * Useful for creating standalone route handlers that need full Next-Blog infrastructure
 */
export function createSingleEndpointNextJSRouter(apiFunction: OneApiFunction) {
    return (dbProvider: () => Promise<DatabaseAdapter>) => {
        // Create a simple path object with just the root endpoint
        const pathObject = wrapPathObject({db: dbProvider}, {
            '*': apiFunction,
            '[...]': apiFunction,
        });

        // Create auth handler
        const authHandler = new BasicAuthHandler(dbProvider);

        // Create router
        const router = createNextJSRouter(pathObject, {
            pathPrefix: "", // No prefix needed for direct endpoints
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