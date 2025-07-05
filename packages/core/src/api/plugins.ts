import secure, {type CNextRequest} from "../utils/secureInternal.js";
import {DatabaseError, NotFound, Success, ValidationError,} from "../utils/errors.js";
import {PluginModule} from "../types.ts";
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
            const body: { url: string } = await request.json() as any;

            // Validate required fields
            if (!body.url) {
                throw new ValidationError("Plugin url is required");
            }

            const response = await fetch(body.url);
            if (!response.ok) {
                throw new Error(`Fetch failed for plugin: ${response.statusText}`);
            }
            const code = await response.text();

            const blob = new Blob([`return ${code}`], {type: 'text/javascript'});
            const objectUrl = URL.createObjectURL(blob);
            const module: PluginModule = new Function(await (await fetch(objectUrl)).text())();
            URL.revokeObjectURL(objectUrl);

            if (!module.name || !module.version || !module.description) {
                throw new ValidationError("Plugin manifest is missing required fields (name, version, description)");
            }

            const creation = await db.plugins.create({
                ...module,
                url: body.url,
            });

            if (module.hooks && typeof module.hooks === 'object') {
                for (const hookName of Object.keys(module.hooks)) {
                    await db.pluginHookMappings.create({
                        pluginId: creation._id,
                        hookName,
                        priority: 10
                    });
                }
            }

            request.configuration.callbacks?.on?.("createPlugin", creation);

            throw new Success("Plugin created successfully", creation);
        } catch (error) {
            if (error instanceof Success || error instanceof ValidationError) throw error;

            console.error("Error creating plugin:", error);
            throw new DatabaseError("Failed to create plugin: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'plugins:create'}
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

            // Also delete all hook mappings for this plugin
            await db.pluginHookMappings.delete({pluginId: request._params.id});

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

// Reinstall a plugin - requires both 'plugins:create' and 'plugins:delete' permission
export const reinstallPlugin = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            // Check if plugin exists first
            const existingPlugin = await db.plugins.findOne({_id: request._params.id});
            if (!existingPlugin) {
                throw new NotFound(`Plugin with id ${request._params.id} not found`);
            }

            await db.pluginHookMappings.delete({pluginId: request._params.id});
            await db.plugins.deleteOne({_id: request._params.id});

            const response = await fetch(existingPlugin.url);
            if (!response.ok) {
                throw new Error(`Fetch failed for plugin: ${response.statusText}`);
            }
            const code = await response.text();

            const blob = new Blob([`return ${code}`], {type: 'text/javascript'});
            const objectUrl = URL.createObjectURL(blob);
            const module: PluginModule = new Function(await (await fetch(objectUrl)).text())();
            URL.revokeObjectURL(objectUrl);

            if (!module.name || !module.version || !module.description) {
                throw new ValidationError("Plugin manifest is missing required fields (name, version, description)");
            }

            const creation = await db.plugins.create({
                ...module,
                url: existingPlugin.url,
            });

            if (module.hooks && typeof module.hooks === 'object') {
                for (const hookName of Object.keys(module.hooks)) {
                    await db.pluginHookMappings.create({
                        pluginId: creation._id,
                        hookName,
                        priority: 10
                    });
                }
            }

            throw new Success("Plugin reinstalled successfully", {clearCache: true});
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound) throw error;

            console.error(`Error reinstalling plugin ${request._params.id}:`, error);
            throw new DatabaseError("Failed to reinstall plugin: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requireAllPermissions: ['plugins:create', 'plugins:delete']}
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

export const executePluginHook = secure(
    async (request: CNextRequest) => {
        const {hookName} = request._params;
        const payload = await request.json();

        if (!hookName) {
            throw new ValidationError("Hook name is required");
        }

        try {
            const result = await pluginExecutor.executeHook(hookName, (request as any).sdk, payload);
            throw new Success(`Hook ${hookName} executed successfully`, result);
        } catch (error) {
            if (error instanceof Success || error instanceof ValidationError) throw error;
            console.error(`Error executing hook ${hookName}:`, error);
            throw new DatabaseError(`Failed to execute hook ${hookName}: ` + (error instanceof Error ? error.message : String(error)));
        }
    }
);


