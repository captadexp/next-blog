import type {Configuration, DatabaseAdapter, ServerSDK, ServerHooks} from "@supergrowthai/next-blog-types/server";
import type {CallServerHookFunction} from "@supergrowthai/next-blog-types";

/**
 * Extra context passed to all API handlers
 */
export interface ApiExtra {
    /** Database factory function */
    db: () => Promise<DatabaseAdapter>;

    /** Execute plugin hooks */
    callHook: CallServerHookFunction<ServerHooks>;

    /** Configuration callbacks */
    callbacks?: {
        on?: <T = unknown>(event: string, data: T) => void;
    };

    /** Configuration object */
    configuration: Configuration;

    /** SDK instance for plugins - contains log, db, settings, callHook, etc */
    sdk: ServerSDK;
}