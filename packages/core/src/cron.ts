import pluginExecutor from './plugins/plugin-executor.server.js';
import Logger from './utils/Logger.js';
import {DatabaseAdapter} from "./types.js";

/**
 * This function is designed to be called by a cron job.
 * It initializes the necessary component and executes the 'every-minute-blog' hook.
 */
export async function runCronJob(db: DatabaseAdapter) {
    const logger = new Logger('Cron');

    // The plugin executor needs to be initialized to load plugins and hooks
    if (!pluginExecutor.initalized) {
        await pluginExecutor.initialize(db);
    }

    const sdk = {
        db,
        log: logger,
    };

    logger.info("Executing 'every-minute-blog' hook from cron job...");
    await pluginExecutor.executeHook('every-minute-blog', sdk, {});
    logger.info("Cron job execution for 'every-minute-blog' hook completed.");
}
