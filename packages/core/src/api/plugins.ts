import secure, {type CNextRequest} from "../utils/secureInternal.js";
import {DatabaseError, NotFound, Success, ValidationError,} from "../utils/errors.js";
import pluginExecutor from "../plugins/plugin-executor.server.js";

// List all plugins - requires 'plugins:list' permission
export const getPlugins = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            const plugins = await db.plugins.find({});
            throw new Success("Plugins retrieved successfully", plugins);
        } catch (error) {
            if (error instanceof Success) throw error;

            console.error("Error fetching plugins:", error);
            throw new DatabaseError("Failed to retrieve plugins: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'plugins:list'}
);

// Get a single plugin by ID - requires 'plugins:read' permission
export const getPluginById = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            const plugin = await db.plugins.findOne({_id: request._params.id});

            if (!plugin) {
                throw new NotFound(`Plugin with id ${request._params.id} not found`);
            }

            throw new Success("Plugin retrieved successfully", plugin);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound) throw error;

            console.error(`Error fetching plugin ${request._params.id}:`, error);
            throw new DatabaseError("Failed to retrieve plugin: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'plugins:read'}
);

// Create a new plugin - requires 'plugins:create' permission
export const createPlugin = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            const body: any = await request.json();

            // Validate required fields
            if (!body.name) {
                throw new ValidationError("Plugin name is required");
            }

            if (!body.type) {
                throw new ValidationError("Plugin type is required");
            }

            if (!body.entryPoint) {
                throw new ValidationError("Plugin entry point is required");
            }

            const extras = {
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            const creation = await db.plugins.create({
                ...body,
                ...extras
            });

            request.configuration.callbacks?.on?.("createPlugin", creation);

            await pluginExecutor.postInstall(creation._id);

            throw new Success("Plugin created successfully", creation);
        } catch (error) {
            if (error instanceof Success || error instanceof ValidationError) throw error;

            console.error("Error creating plugin:", error);
            throw new DatabaseError("Failed to create plugin: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'plugins:create'}
);

// Update a plugin - requires 'plugins:update' permission
export const updatePlugin = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            const body: any = await request.json();
            const extras = {updatedAt: Date.now()};

            // Check if plugin exists first
            const existingPlugin = await db.plugins.findOne({_id: request._params.id});
            if (!existingPlugin) {
                throw new NotFound(`Plugin with id ${request._params.id} not found`);
            }

            const updation = await db.plugins.updateOne(
                {_id: request._params.id},
                {...body, ...extras}
            );

            request.configuration.callbacks?.on?.("updatePlugin", updation);
            throw new Success("Plugin updated successfully", updation);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound || error instanceof ValidationError) throw error;

            console.error(`Error updating plugin ${request._params.id}:`, error);
            throw new DatabaseError("Failed to update plugin: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'plugins:update'}
);

// Delete a plugin - requires 'plugins:delete' permission
export const deletePlugin = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            // Check if plugin exists first
            const existingPlugin = await db.plugins.findOne({_id: request._params.id});
            if (!existingPlugin) {
                throw new NotFound(`Plugin with id ${request._params.id} not found`);
            }

            await pluginExecutor.onDelete(request._params.id);

            // Also delete all hook mappings for this plugin
            const hookMappings = await db.pluginHookMappings.find({pluginId: request._params.id});
            for (const mapping of hookMappings) {
                await db.pluginHookMappings.deleteOne({_id: mapping._id});
            }

            const deletion = await db.plugins.deleteOne({_id: request._params.id});
            request.configuration.callbacks?.on?.("deletePlugin", deletion);
            throw new Success("Plugin deleted successfully", deletion);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound) throw error;

            console.error(`Error deleting plugin ${request._params.id}:`, error);
            throw new DatabaseError("Failed to delete plugin: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'plugins:delete'}
);

// Reinstall a plugin - requires 'plugins:reinstall' permission
export const reinstallPlugin = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            // Check if plugin exists first
            const existingPlugin = await db.plugins.findOne({_id: request._params.id});
            if (!existingPlugin) {
                throw new NotFound(`Plugin with id ${request._params.id} not found`);
            }

            // Call onDelete and then postInstall
            await pluginExecutor.onDelete(request._params.id);
            await pluginExecutor.postInstall(request._params.id);

            throw new Success("Plugin reinstalled successfully", {clearCache: true});
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound) throw error;

            console.error(`Error reinstalling plugin ${request._params.id}:`, error);
            throw new DatabaseError("Failed to reinstall plugin: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'plugins:reinstall'}
);

// List all plugin hook mappings - requires 'plugins:list' permission
export const getPluginHookMappings = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            const pluginId = request._params.pluginId;
            const filter = pluginId ? {pluginId} : {};
            const mappings = await db.pluginHookMappings.find(filter);
            throw new Success("Plugin hook mappings retrieved successfully", mappings);
        } catch (error) {
            if (error instanceof Success) throw error;

            console.error("Error fetching plugin hook mappings:", error);
            throw new DatabaseError("Failed to retrieve plugin hook mappings: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'plugins:list'}
);

// Get a single plugin hook mapping by ID - requires 'plugins:read' permission
export const getPluginHookMappingById = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            const mapping = await db.pluginHookMappings.findOne({_id: request._params.id});

            if (!mapping) {
                throw new NotFound(`Plugin hook mapping with id ${request._params.id} not found`);
            }

            throw new Success("Plugin hook mapping retrieved successfully", mapping);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound) throw error;

            console.error(`Error fetching plugin hook mapping ${request._params.id}:`, error);
            throw new DatabaseError("Failed to retrieve plugin hook mapping: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'plugins:read'}
);

// Create a new plugin hook mapping - requires 'plugins:create' permission
export const createPluginHookMapping = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            const body: any = await request.json();

            // Validate required fields
            if (!body.pluginId) {
                throw new ValidationError("Plugin ID is required");
            }

            if (!body.hookName) {
                throw new ValidationError("Hook name is required");
            }

            // Check if plugin exists
            const plugin = await db.plugins.findOne({_id: body.pluginId});
            if (!plugin) {
                throw new NotFound(`Plugin with id ${body.pluginId} not found`);
            }

            const extras = {
                createdAt: Date.now(),
                updatedAt: Date.now(),
                priority: body.priority || 0
            };

            const creation = await db.pluginHookMappings.create({
                ...body,
                ...extras
            });

            request.configuration.callbacks?.on?.("createPluginHookMapping", creation);
            throw new Success("Plugin hook mapping created successfully", creation);
        } catch (error) {
            if (error instanceof Success || error instanceof ValidationError || error instanceof NotFound) throw error;

            console.error("Error creating plugin hook mapping:", error);
            throw new DatabaseError("Failed to create plugin hook mapping: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'plugins:create'}
);

// Update a plugin hook mapping - requires 'plugins:update' permission
export const updatePluginHookMapping = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            const body: any = await request.json();
            const extras = {updatedAt: Date.now()};

            // Check if mapping exists first
            const existingMapping = await db.pluginHookMappings.findOne({_id: request._params.id});
            if (!existingMapping) {
                throw new NotFound(`Plugin hook mapping with id ${request._params.id} not found`);
            }

            // If pluginId is being changed, check if the new plugin exists
            if (body.pluginId && body.pluginId !== existingMapping.pluginId) {
                const plugin = await db.plugins.findOne({_id: body.pluginId});
                if (!plugin) {
                    throw new NotFound(`Plugin with id ${body.pluginId} not found`);
                }
            }

            const updation = await db.pluginHookMappings.updateOne(
                {_id: request._params.id},
                {...body, ...extras}
            );

            request.configuration.callbacks?.on?.("updatePluginHookMapping", updation);
            throw new Success("Plugin hook mapping updated successfully", updation);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound || error instanceof ValidationError) throw error;

            console.error(`Error updating plugin hook mapping ${request._params.id}:`, error);
            throw new DatabaseError("Failed to update plugin hook mapping: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'plugins:update'}
);

// Delete a plugin hook mapping - requires 'plugins:delete' permission
export const deletePluginHookMapping = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            // Check if mapping exists first
            const existingMapping = await db.pluginHookMappings.findOne({_id: request._params.id});
            if (!existingMapping) {
                throw new NotFound(`Plugin hook mapping with id ${request._params.id} not found`);
            }

            const deletion = await db.pluginHookMappings.deleteOne({_id: request._params.id});
            request.configuration.callbacks?.on?.("deletePluginHookMapping", deletion);
            throw new Success("Plugin hook mapping deleted successfully", deletion);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound) throw error;

            console.error(`Error deleting plugin hook mapping ${request._params.id}:`, error);
            throw new DatabaseError("Failed to delete plugin hook mapping: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'plugins:delete'}
);
