import secure, {type CNextRequest} from "../utils/secureInternal.js";
import {DatabaseError, NotFound, Success, ValidationError} from "../utils/errors.js";
import pluginExecutor from "../plugins/plugin-executor.server.js";
import pluginManager from "../plugins/pluginManager.js";
import Logger, {LogLevel} from "../utils/Logger.js";
import {createId} from "@supergrowthai/types/server";

const logger = new Logger('plugins-api', LogLevel.ERROR);

export const getPlugins = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        logger.info('Listing all plugins');

        try {
            const plugins = await db.plugins.find({});
            logger.info('Plugins retrieved successfully');
            throw new Success("Plugins retrieved successfully", plugins);
        } catch (error) {
            if (error instanceof Success) throw error;
            logger.error("Error fetching plugins:", error);
            throw new DatabaseError("Failed to retrieve plugins: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'plugins:list'}
);

export const getPluginById = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const pluginId = request._params.id;
        logger.info(`Getting plugin by ID: ${pluginId}`);

        try {
            const plugin = await db.plugins.findOne({_id: pluginId});
            if (!plugin) {
                logger.warn(`Plugin not found: ${pluginId}`);
                throw new NotFound(`Plugin with id ${pluginId} not found`);
            }
            logger.info(`Plugin ${pluginId} retrieved successfully`);
            throw new Success("Plugin retrieved successfully", plugin);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound) throw error;
            logger.error(`Error fetching plugin ${pluginId}:`, error);
            throw new DatabaseError("Failed to retrieve plugin: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'plugins:read'}
);

export const createPlugin = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        logger.time('Create plugin');
        logger.info('Attempting to create a new plugin');

        try {
            const {url} = (await request.json()) as { url: string };
            const creation = await pluginManager.installPlugin(db, url);

            request.configuration.callbacks?.on?.("createPlugin", creation);
            pluginExecutor.initalized = false;
            throw new Success("Plugin created successfully", creation);
        } catch (error) {
            if (error instanceof Success || error instanceof ValidationError) throw error;
            logger.error("Error creating plugin:", error);
            throw new DatabaseError("Failed to create plugin: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            logger.timeEnd('Create plugin');
        }
    },
    {requirePermission: 'plugins:create'}
);

export const deletePlugin = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const pluginId = request._params.id;
        logger.time(`Delete plugin ${pluginId}`);
        logger.info(`Attempting to delete plugin with ID: ${pluginId}`);

        try {
            const existing = await db.plugins.findOne({_id: pluginId});
            if (!existing) {
                logger.warn(`Delete failed, not found: ${pluginId}`);
                throw new NotFound(`Plugin with id ${pluginId} not found`);
            }
            await pluginManager.deletePluginAndMappings(db, pluginId);
            logger.info(`Plugin ${pluginId} deleted successfully`);
            request.configuration.callbacks?.on?.("deletePlugin", {_id: createId.plugin(pluginId)});
            throw new Success("Plugin deleted successfully", {_id: pluginId});
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound) throw error;
            logger.error(`Error deleting plugin ${pluginId}:`, error);
            throw new DatabaseError("Failed to delete plugin: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            logger.timeEnd(`Delete plugin ${pluginId}`);
        }
    },
    {requirePermission: 'plugins:delete'}
);

export const reinstallPlugin = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const pluginId = request._params.id;
        logger.time(`Reinstall plugin ${pluginId}`);
        logger.info(`Attempting to reinstall plugin ID: ${pluginId}`);

        try {
            const existing = await db.plugins.findOne({_id: pluginId});
            if (!existing) {
                logger.warn(`Reinstall failed, not found: ${pluginId}`);
                throw new NotFound(`Plugin with id ${pluginId} not found`);
            }
            await pluginManager.deletePluginAndMappings(db, pluginId);
            request.configuration.callbacks?.on?.("deletePlugin", {_id: createId.plugin(pluginId)});
            const creation = await pluginManager.installPlugin(db, existing.url);
            request.configuration.callbacks?.on?.("createPlugin", creation);
            pluginExecutor.initalized = false;
            throw new Success("Plugin reinstalled successfully", {clearCache: true});
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound) throw error;
            logger.error(`Error reinstalling plugin ${pluginId}:`, error);
            throw new DatabaseError("Failed to reinstall plugin: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            logger.timeEnd(`Reinstall plugin ${pluginId}`);
        }
    },
    {requireAllPermissions: ['plugins:create', 'plugins:delete']}
);

export const getPluginHookMappings = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const pluginId = request._params.pluginId;
        const type = request.nextUrl.searchParams.get('type');
        logger.info(`Listing plugin hook mappings for pluginId: ${pluginId || 'all'}`);

        try {
            const filter: any = pluginId ? {pluginId} : {};
            if (type) filter.type = type;
            const mappings = await db.pluginHookMappings.find(filter);
            logger.info('Plugin hook mappings retrieved successfully');
            throw new Success("Plugin hook mappings retrieved successfully", mappings);
        } catch (error) {
            if (error instanceof Success) throw error;
            logger.error("Error fetching plugin hook mappings:", error);
            throw new DatabaseError("Failed to retrieve plugin hook mappings: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'plugins:list'}
);

export const executePluginRpc = secure(
    async (request: CNextRequest) => {
        const {rpcName} = request._params;
        const payload = await request.json();
        logger.info(`Executing plugin rpc: ${rpcName}`);

        if (!rpcName) {
            logger.warn('RPC execution failed: name required');
            throw new ValidationError("Hook name is required");
        }

        try {
            const result = await pluginExecutor.executeRpc(rpcName, request.sdk, payload);
            logger.info(`RPC ${rpcName} executed successfully`);
            throw new Success(`Hook ${rpcName} executed successfully`, result);
        } catch (error) {
            if (error instanceof Success || error instanceof ValidationError) throw error;
            logger.error(`Error executing rpc ${rpcName}:`, error);
            throw new DatabaseError(`Failed to execute hook ${rpcName}: ` + (error instanceof Error ? error.message : String(error)));
        }
    }
);
