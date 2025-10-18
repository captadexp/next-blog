import type {MinimumRequest, SessionData} from "@supergrowthai/oneapi";
import secure from "../utils/secureInternal.js";
import type {ApiExtra} from "../types/api.js";
import {Success} from "../utils/errors.js";

/**
 * Get the UI configuration
 * This endpoint returns the UI configuration for customizing the dashboard
 */
export const getConfig = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    // Extract only the UI configuration from the global configuration
    const {ui} = extra.configuration;

    // Return only the UI configuration to avoid exposing sensitive data
    throw new Success("Configuration retrieved successfully", ui);
});