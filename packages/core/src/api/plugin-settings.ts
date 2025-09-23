import secure, {CNextRequest} from "../utils/secureInternal.js";
import {DatabaseError, NotFound, Success, ValidationError} from "../utils/errors.js";

/**
 * Get all settings for a specific plugin
 */
export const getPluginSettings = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const pluginId = request._params.pluginId;

        try {
            // Get all settings for this plugin
            const settings = await db.settings.find({owner: pluginId});

            // Transform to key-value pairs for easier consumption
            const settingsMap: Record<string, any> = {};
            settings.forEach(setting => {
                settingsMap[setting.key] = setting.value;
            });

            throw new Success("Plugin settings retrieved successfully", settingsMap);
        } catch (error) {
            if (error instanceof Success) throw error;

            console.error(`Error fetching settings for plugin ${pluginId}:`, error);
            throw new DatabaseError("Failed to retrieve plugin settings: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'settings:list'}
);

/**
 * Get a specific setting for a plugin
 */
export const getPluginSetting = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const {pluginId, key} = request._params;

        try {
            const setting = await db.settings.findOne({
                owner: pluginId,
                key: key
            });

            if (!setting) {
                throw new NotFound(`Setting '${key}' not found for plugin ${pluginId}`);
            }

            throw new Success("Plugin setting retrieved successfully", setting.value);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound) throw error;

            console.error(`Error fetching setting ${key} for plugin ${pluginId}:`, error);
            throw new DatabaseError("Failed to retrieve plugin setting: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'settings:read'}
);

/**
 * Set a specific setting for a plugin
 */
export const setPluginSetting = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const {pluginId, key} = request._params;

        try {
            const data: any = await request.json();
            const value = data.value;

            if (value === undefined) {
                throw new ValidationError("Setting value is required");
            }

            // Check if setting exists
            const existing = await db.settings.findOne({
                owner: pluginId,
                key: key
            });

            if (existing) {
                // Update existing setting
                const updated = await db.settings.updateOne(
                    {_id: existing._id},
                    {
                        value,
                        updatedAt: Date.now()
                    }
                );
                request.configuration.callbacks?.on?.("updateSettingsEntry", updated);
                throw new Success("Plugin setting updated successfully", updated);
            } else {
                // Create new setting
                const created = await db.settings.create({
                    key,
                    value,
                    owner: pluginId,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
                request.configuration.callbacks?.on?.("createSettingsEntry", created);
                throw new Success("Plugin setting created successfully", created);
            }
        } catch (error) {
            if (error instanceof Success || error instanceof ValidationError) throw error;

            console.error(`Error setting ${key} for plugin ${pluginId}:`, error);
            throw new DatabaseError("Failed to set plugin setting: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'settings:update'}
);

/**
 * Delete a specific setting for a plugin
 */
export const deletePluginSetting = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const {pluginId, key} = request._params;

        try {
            const existing = await db.settings.findOne({
                owner: pluginId,
                key: key
            });

            if (!existing) {
                throw new NotFound(`Setting '${key}' not found for plugin ${pluginId}`);
            }

            const deleted = await db.settings.deleteOne({_id: existing._id});
            request.configuration.callbacks?.on?.("deleteSettingsEntry", deleted);

            throw new Success("Plugin setting deleted successfully", deleted);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound) throw error;

            console.error(`Error deleting setting ${key} for plugin ${pluginId}:`, error);
            throw new DatabaseError("Failed to delete plugin setting: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'settings:delete'}
);