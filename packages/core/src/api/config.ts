import {CNextRequest} from "../types";
import secure from "../utils/secureInternal";
import {Success} from "../utils/errors";

/**
 * Get the UI configuration
 * This endpoint returns the UI configuration for customizing the dashboard
 */
export const getConfig = secure(async (request: CNextRequest) => {
    try {
        // Extract only the UI configuration from the global configuration
        const {ui} = request.configuration;

        // Return only the UI configuration to avoid exposing sensitive data
        throw new Success("Configuration retrieved successfully", ui);
    } catch (error) {
        if (error instanceof Success) throw error;
        throw error;
    }
});