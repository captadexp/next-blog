import type {Configuration, ServerSDK} from "@supergrowthai/next-blog-types/server";

/**
 * Extra context passed to all API handlers
 */
export interface ApiExtra {
    /** Configuration callbacks */
    callbacks?: {
        on?: <T = unknown>(event: string, data: T) => void;
    };

    /** Configuration object */
    configuration: Configuration;

    /** SDK instance for plugins - contains log, db, settings, callHook, etc */
    sdk: ServerSDK;
}