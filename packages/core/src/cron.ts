import pluginExecutor from './plugins/plugin-executor.server.js';
import Logger from './utils/Logger.js';
import { DatabaseAdapter } from "./types.js";

/**
 * This function is designed to be called by a cron job on an hourly basis.
 * It initializes the necessary component and executes the generic 'scheduled-blog-post' hook.
 * Plugins can then use this hook to perform tasks every hour.
 */
export async function runHourlyJob(db: DatabaseAdapter) {
    const logger = new Logger('Cron');

    if (!pluginExecutor.initalized) {
        await pluginExecutor.initialize(db);
    }

    const sdk = {
        db,
        log: logger,
    };

    logger.info("Executing 'scheduled-blog-post' hook from cron job...");
    await pluginExecutor.executeHook('scheduled-blog-post', sdk, {});
    logger.info("Cron job execution for 'scheduled-blog-post' hook completed.");
}
