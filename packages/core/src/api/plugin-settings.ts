import type {MinimumRequest, OneApiFunctionResponse, SessionData} from "@supergrowthai/oneapi/types";
import {BadRequest, NotFound} from "@supergrowthai/oneapi";
import {createId} from "@supergrowthai/types/server";
import secure from "../utils/secureInternal.js";
import type {ApiExtra} from "../types/api.js";

// Get all settings for a specific plugin
export const getPluginSettings = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const pluginId = request._params?.pluginId;

    if (!pluginId) {
        throw new BadRequest("Plugin ID is required");
    }

    const db = await extra.db();

    // Get all settings for this plugin
    const settings = await db.settings.find({ownerId: createId.user(pluginId)});

    // Transform to key-value pairs for easier consumption
    const settingsMap: Record<string, any> = {};
    settings.forEach((setting: any) => {
        settingsMap[setting.key] = setting.value;
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

    const db = await extra.db();

    const setting = await db.settings.findOne({
        ownerId: createId.user(pluginId),
        key: key
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

    const db = await extra.db();

    // Check if setting exists
    const existing = await db.settings.findOne({
        ownerId: createId.user(pluginId),
        key: key
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
            key,
            value,
            ownerId: createId.user(pluginId),
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

    const db = await extra.db();

    const existing = await db.settings.findOne({
        ownerId: createId.user(pluginId),
        key: key
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