import type {MinimumRequest, OneApiFunctionResponse, SessionData} from "@supergrowthai/oneapi";
import {BadRequest, NotFound} from "@supergrowthai/oneapi";
import secure from "../utils/secureInternal.js";
import type {ApiExtra} from "../types/api.js";
import {getSystemPluginId} from "../utils/defaultSettings.js";

// Get all settings for a specific plugin
export const getPluginSettings = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const pluginId = request._params?.pluginId;

    if (!pluginId) {
        throw new BadRequest("Plugin ID is required");
    }

    const db = extra.sdk.db;
    const systemPluginId = await getSystemPluginId(db);

    // Get all settings with plugin prefix
    const settings = await db.settings.find({
        ownerId: systemPluginId,
        ownerType: 'plugin'
    });

    // Filter settings for this specific plugin and transform to key-value pairs
    const pluginPrefix = `plugin:${pluginId}:`;
    const settingsMap: Record<string, any> = {};
    settings.forEach((setting: any) => {
        if (setting.key.startsWith(pluginPrefix)) {
            const key = setting.key.substring(pluginPrefix.length);
            settingsMap[key] = setting.value;
        }
    });

    return {
        code: 0,
        message: "Plugin settings retrieved successfully",
        payload: settingsMap
    };
}, {requirePermission: 'plugins:read'});

// Get a specific setting for a plugin
export const getPluginSetting = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const pluginId = request._params?.pluginId;
    const key = request._params?.key;

    if (!pluginId || !key) {
        throw new BadRequest("Plugin ID and key are required");
    }

    const db = extra.sdk.db;
    const systemPluginId = await getSystemPluginId(db);
    const prefixedKey = `plugin:${pluginId}:${key}`;

    const setting = await db.settings.findOne({
        ownerId: systemPluginId,
        key: prefixedKey,
        ownerType: 'plugin'
    });

    if (!setting) {
        throw new NotFound(`Setting '${key}' not found for plugin ${pluginId}`);
    }

    return {
        code: 0,
        message: "Plugin setting retrieved successfully",
        payload: setting.value
    };
}, {requirePermission: 'plugins:read'});

// Set a specific setting for a plugin
export const setPluginSetting = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const pluginId = request._params?.pluginId;
    const key = request._params?.key;

    if (!pluginId || !key) {
        throw new BadRequest("Plugin ID and key are required");
    }

    const data = request.body as any;
    const value = data?.value;

    if (value === undefined) {
        throw new BadRequest("Setting value is required");
    }

    const db = extra.sdk.db;
    const systemPluginId = await getSystemPluginId(db);
    const prefixedKey = `plugin:${pluginId}:${key}`;

    // Check if setting exists
    const existing = await db.settings.findOne({
        ownerId: systemPluginId,
        key: prefixedKey
    });

    let result;
    if (existing) {
        // Update existing setting
        result = await db.settings.updateOne(
            {_id: existing._id},
            {
                value,
                updatedAt: Date.now()
            }
        );

        // Trigger callback if available
        if (extra?.callbacks?.on) {
            extra.callbacks.on("updateSettingsEntry", result);
        }
    } else {
        // Create new setting
        result = await db.settings.create({
            key: prefixedKey,
            value,
            ownerId: systemPluginId,
            ownerType: 'plugin',
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        // Trigger callback if available
        if (extra?.callbacks?.on) {
            extra.callbacks.on("createSettingsEntry", result);
        }
    }

    return {
        code: 0,
        message: existing ? "Plugin setting updated successfully" : "Plugin setting created successfully",
        payload: result
    };
}, {requirePermission: 'plugins:create'});

// Delete a specific setting for a plugin
export const deletePluginSetting = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const pluginId = request._params?.pluginId;
    const key = request._params?.key;

    if (!pluginId || !key) {
        throw new BadRequest("Plugin ID and key are required");
    }

    const db = extra.sdk.db;
    const systemPluginId = await getSystemPluginId(db);
    const prefixedKey = `plugin:${pluginId}:${key}`;

    const existing = await db.settings.findOne({
        ownerId: systemPluginId,
        key: prefixedKey
    });

    if (!existing) {
        throw new NotFound(`Setting '${key}' not found for plugin ${pluginId}`);
    }

    const deleted = await db.settings.deleteOne({_id: existing._id});

    // Trigger callback if available
    if (extra?.callbacks?.on) {
        extra.callbacks.on("deleteSettingsEntry", deleted);
    }

    return {
        code: 0,
        message: "Plugin setting deleted successfully",
        payload: deleted
    };
}, {requirePermission: 'plugins:delete'});