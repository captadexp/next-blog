import type {MinimumRequest, OneApiFunctionResponse, SessionData} from "@supergrowthai/oneapi/types";
import secure from "../utils/secureInternal.js";
import type {ApiExtra} from "../types/api.js";

/**
 * Get the UI configuration
 * This endpoint returns the UI configuration for customizing the dashboard
 */
export const getConfig = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    // Extract only the UI configuration from the global configuration
    const {ui} = extra.configuration;

    // Return only the UI configuration to avoid exposing sensitive data
    return {
        code: 0,
        message: "Configuration retrieved successfully",
        payload: ui
    };
});