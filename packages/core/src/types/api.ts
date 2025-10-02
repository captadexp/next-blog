import type {Configuration, DatabaseAdapter, ServerSDK, ServerHooks} from "@supergrowthai/types/server";
import type {CallServerHookFunction} from "@supergrowthai/types";

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