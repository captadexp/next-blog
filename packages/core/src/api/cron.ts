import secure, {type CNextRequest} from "../utils/secureInternal.js";
import {DatabaseError, Success} from "../utils/errors.js";
import pluginExecutor from "../plugins/plugin-executor.server.js";
import Logger, {LogLevel} from "../utils/Logger.js";

const logger = new Logger('cron-api', LogLevel.INFO);

export const everyMinute = secure(
    async (request: CNextRequest) => {
        logger.info('Executing every minute cron job');

        try {
            // Execute the 'everyMinute' hook for all registered plugins
            const result = await pluginExecutor.executeHook('every-minute-cron', (request as any).sdk, {});
            logger.info('Every minute cron job executed successfully');
            throw new Success("Every minute cron job executed successfully", result);
        } catch (error) {
            if (error instanceof Success) throw error;
            logger.error("Error executing every minute cron job:", error);
            throw new DatabaseError("Failed to execute every minute cron job: " + (error instanceof Error ? error.message : String(error)));
        }
    }
);