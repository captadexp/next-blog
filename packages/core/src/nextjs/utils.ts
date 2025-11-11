import {Configuration} from "@supergrowthai/next-blog-types";
import {getSystemPluginId} from "../utils/defaultSettings.js";
import {ServerSDKFactory} from "../plugins/sdk-factory.server.js";
import Logger, {LogLevel} from "../utils/Logger.js";
import pluginExecutor from "../plugins/plugin-executor.server.js";

export async function createServerSDK(configuration: Configuration) {
    const db = await configuration.db();
    const systemPluginId = await getSystemPluginId(db);
    const systemPlugin = await db.plugins.findById(systemPluginId);

    if (!systemPlugin) {
        throw new Error('System plugin not found');
    }

    await pluginExecutor.initialize(db)
    const sdkFactory = new ServerSDKFactory({
        db,
        log: new Logger('ServerSDK', LogLevel.DEBUG),
        pluginExecutor
    });

    const sdk = await sdkFactory.createSDK(systemPlugin);
    return sdk
}