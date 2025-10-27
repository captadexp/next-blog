import type {MinimumRequest, OneApiFunctionResponse, SessionData} from "@supergrowthai/oneapi";
import {BadRequest, NotFound} from "@supergrowthai/oneapi";
import {createId, Plugin} from "@supergrowthai/next-blog-types/server";
import {PaginatedResponse, PaginationParams,} from "@supergrowthai/next-blog-types";
import secure from "../utils/secureInternal.js";
import type {ApiExtra} from "../types/api.js";
import pluginExecutor from "../plugins/plugin-executor.server.js";
import pluginManager from "../plugins/pluginManager.js";
import {Logger, LogLevel} from "@supergrowthai/utils";

const logger = new Logger('plugins-api', LogLevel.ERROR);

// List all plugins
export const getPlugins = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = extra.sdk.db;
    const params = request.query as PaginationParams | undefined;
    logger.info('Listing all plugins');

    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 10;

    const skip = (page - 1) * limit;
    const plugins = await db.plugins.find({}, {skip, limit});

    const paginatedResponse: PaginatedResponse<Plugin> = {
        data: plugins,
        page,
        limit
    };

    logger.info('Plugins retrieved successfully');

    return {
        code: 0,
        message: "Plugins retrieved successfully",
        payload: paginatedResponse
    };
}, {requirePermission: 'plugins:list'});

// Get a single plugin by ID
export const getPluginById = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const pluginId = request._params?.id;
    logger.info(`Getting plugin by ID: ${pluginId}`);

    if (!pluginId) {
        throw new BadRequest("Plugin ID is required");
    }

    const db = extra.sdk.db;
    const plugin = await db.plugins.findOne({_id: pluginId});

    if (!plugin) {
        logger.warn(`Plugin not found: ${pluginId}`);
        throw new NotFound(`Plugin with id ${pluginId} not found`);
    }

    logger.info(`Plugin ${pluginId} retrieved successfully`);

    return {
        code: 0,
        message: "Plugin retrieved successfully",
        payload: plugin
    };
}, {requirePermission: 'plugins:read'});

// Create/install a plugin
export const createPlugin = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = extra.sdk.db;
    logger.time('Create plugin');
    logger.info('Attempting to create a new plugin');

    try {
        const body = request.body as { url: string };

        if (!body.url) {
            throw new BadRequest("Plugin URL is required");
        }

        const creation = await pluginManager.installPlugin(db, body.url);

        // Trigger callback if available
        if (extra?.callbacks?.on) {
            extra.callbacks.on("createPlugin", creation);
        }

        pluginExecutor.initalized = false;

        return {
            code: 0,
            message: "Plugin created successfully",
            payload: creation
        };
    } finally {
        logger.timeEnd('Create plugin');
    }
}, {requirePermission: 'plugins:create'});

// Delete a plugin
export const deletePlugin = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const pluginId = request._params?.id;
    logger.time(`Delete plugin ${pluginId}`);
    logger.info(`Attempting to delete plugin with ID: ${pluginId}`);

    try {
        if (!pluginId) {
            throw new BadRequest("Plugin ID is required");
        }

        const db = extra.sdk.db;
        const existing = await db.plugins.findOne({_id: pluginId});

        if (!existing) {
            logger.warn(`Delete failed, not found: ${pluginId}`);
            throw new NotFound(`Plugin with id ${pluginId} not found`);
        }

        // Prevent deletion of system plugin
        if (existing.isSystem) {
            throw new BadRequest("System plugin cannot be deleted");
        }

        await pluginManager.deletePluginAndMappings(db, pluginId);
        logger.info(`Plugin ${pluginId} deleted successfully`);

        // Trigger callback if available
        if (extra?.callbacks?.on) {
            extra.callbacks.on("deletePlugin", {_id: createId.plugin(pluginId)});
        }

        return {
            code: 0,
            message: "Plugin deleted successfully",
            payload: {_id: pluginId}
        };
    } finally {
        logger.timeEnd(`Delete plugin ${pluginId}`);
    }
}, {requirePermission: 'plugins:delete'});

// Reinstall a plugin
export const reinstallPlugin = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const pluginId = request._params?.id;
    logger.time(`Reinstall plugin ${pluginId}`);
    logger.info(`Attempting to reinstall plugin ID: ${pluginId}`);
    //todo should we reinstall with same installation id again?

    try {
        if (!pluginId) {
            throw new BadRequest("Plugin ID is required");
        }

        const db = extra.sdk.db;
        const existing = await db.plugins.findOne({_id: pluginId});

        if (!existing) {
            logger.warn(`Reinstall failed, not found: ${pluginId}`);
            throw new NotFound(`Plugin with id ${pluginId} not found`);
        }

        // Prevent reinstall of system plugin
        if (existing.isSystem) {
            throw new BadRequest("System plugin cannot be reinstalled");
        }

        await pluginManager.deletePluginAndMappings(db, pluginId);

        // Trigger delete callback if available
        if (extra?.callbacks?.on) {
            extra.callbacks.on("deletePlugin", {_id: createId.plugin(pluginId)});
        }

        const creation = await pluginManager.installPlugin(db, existing.url);

        // Trigger create callback if available
        if (extra?.callbacks?.on) {
            extra.callbacks.on("createPlugin", creation);
        }

        pluginExecutor.initalized = false;

        return {
            code: 0,
            message: "Plugin reinstalled successfully",
            payload: {clearCache: true}
        };
    } finally {
        logger.timeEnd(`Reinstall plugin ${pluginId}`);
    }
}, {requirePermission: 'plugins:create'});

// Get plugin hook mappings
export const getPluginHookMappings = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const pluginId = request._params?.pluginId;
    const type = request.query?.type;
    logger.info(`Listing plugin hook mappings for pluginId: ${pluginId || 'all'}`);

    const db = extra.sdk.db;
    const filter: any = pluginId ? {pluginId} : {};
    if (type) filter.type = type;

    const mappings = await db.pluginHookMappings.find(filter);
    logger.info('Plugin hook mappings retrieved successfully');

    return {
        code: 0,
        message: "Plugin hook mappings retrieved successfully",
        payload: mappings
    };
}, {requirePermission: 'plugins:read'});

// Execute plugin RPC
export const executePluginRpc = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const rpcName = request._params?.rpcName;
    const payload = request.body;
    logger.info(`Executing plugin rpc: ${rpcName}`);

    if (!rpcName) {
        logger.warn('RPC execution failed: name required');
        throw new BadRequest("Hook name is required");
    }

    const result = await pluginExecutor.executeRpc(rpcName, extra?.sdk, payload);
    logger.info(`RPC ${rpcName} executed successfully`);

    return {
        code: 0,
        message: `RPC ${rpcName} executed successfully`,
        payload: result
    };
}, {requirePermission: 'plugins:create'});