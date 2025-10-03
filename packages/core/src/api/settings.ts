import type {MinimumRequest, OneApiFunctionResponse, SessionData} from "@supergrowthai/oneapi/types";
import {BadRequest, NotFound} from "@supergrowthai/oneapi";
import secure from "../utils/secureInternal.js";
import type {ApiExtra} from "../types/api.js";
import type {SettingsEntryData} from "@supergrowthai/types/server";
import {createId} from "@supergrowthai/types/server";
import {getSystemPluginId} from "../utils/defaultSettings.js";
import {encrypt, isSecureKey, maskValue} from "../utils/encryption.js";

// List all settings
export const getSettings = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = await extra.db();
    const systemPluginId = await getSystemPluginId(db);
    let settings = await db.settings.find({});

    // Add scope information and mask secure values
    settings = settings.map((setting: any) => {
        const isUserSetting = setting.ownerType === 'user';
        const isSystemPlugin = setting.ownerId === createId.plugin(systemPluginId);

        // Mask secure values
        let maskedSetting = {
            ...setting,
            scope: isUserSetting ? 'user' : (isSystemPlugin ? 'global' : 'plugin')
        };

        if (setting.isSecure) {
            maskedSetting.value = maskValue(setting.value);
            maskedSetting.masked = true;
            maskedSetting.isSecure = true;
        }

        return maskedSetting;
    });

    // Execute hook for list operation
    if (extra?.callHook) {
        const hookResult = await extra.callHook('setting:onList', {
            entity: 'setting',
            operation: 'list',
            filters: {},
            data: settings
        });
        if (hookResult?.data) {
            settings = hookResult.data;
        }
    }

    return {
        code: 0,
        message: "Settings retrieved successfully",
        payload: settings
    };
}, {requirePermission: 'settings:list'});

// Get a single setting by ID
export const getSettingById = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const settingId = request._params?.id;

    if (!settingId) {
        throw new BadRequest("Setting ID is required");
    }

    const db = await extra.db();
    let setting = await db.settings.findOne({_id: settingId});

    if (!setting) {
        throw new NotFound(`Setting with id ${settingId} not found`);
    }

    // Mask secure values
    if (setting.isSecure) {
        setting = {
            ...setting,
            value: maskValue(setting.value),
            masked: true,
            isSecure: true
        };
    }

    // Execute hook for read operation
    if (extra?.callHook) {
        const hookResult = await extra.callHook('setting:onRead', {
            entity: 'setting',
            operation: 'read',
            id: settingId,
            data: setting
        });
        if (hookResult?.data) {
            setting = hookResult.data;
        }
    }

    return {
        code: 0,
        message: "Setting retrieved successfully",
        payload: setting
    };
}, {requirePermission: 'settings:read'});

// Create a new setting
export const createSetting = secure(async (session: SessionData, request: MinimumRequest<any, Partial<SettingsEntryData> & {
    scope?: 'global' | 'user'
}>, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = await extra.db();
    let settingData = request.body as Partial<SettingsEntryData> & { scope?: 'global' | 'user' };

    if (!settingData.key) {
        throw new BadRequest("Setting key is required");
    }

    if (settingData.value === undefined) {
        throw new BadRequest("Setting value is required");
    }

    // Check if the key indicates a secure setting
    // User's explicit choice takes precedence, but we auto-detect if not specified
    if (settingData.isSecure === undefined) {
        settingData.isSecure = isSecureKey(settingData.key);
    }

    // Determine owner based on scope (default to global)
    const scope = settingData.scope || 'global';

    if (scope === 'user') {
        // User-scoped settings are owned by the current user
        settingData.ownerId = createId.user(session.user._id);
        settingData.ownerType = 'user';
        // Prefix key with user ID to avoid conflicts
        settingData.key = `user:${session.user._id}:${settingData.key}`;
    } else {
        // Global settings are owned by system plugin
        const systemPluginId = await getSystemPluginId(db);
        settingData.ownerId = createId.plugin(systemPluginId);
        settingData.ownerType = 'plugin';
    }

    // Encrypt the value if it's a secure setting
    if (settingData.isSecure) {
        settingData.value = encrypt(settingData.value);
    }

    // Remove scope from data as it's not part of the entity
    delete (settingData as any).scope;

    // Execute before create hook
    if (extra?.callHook) {
        const beforeResult = await extra.callHook('setting:beforeCreate', {
            entity: 'setting',
            operation: 'create',
            data: settingData
        });
        if (beforeResult?.data) {
            settingData = beforeResult.data;
        }
    }

    // Set timestamps
    settingData.createdAt = Date.now();
    settingData.updatedAt = Date.now();

    const setting = await db.settings.create(<SettingsEntryData>settingData);

    // Execute after create hook
    if (extra?.callHook) {
        await extra.callHook('setting:afterCreate', {
            entity: 'setting',
            operation: 'create',
            id: setting._id,
            data: setting
        });
    }

    return {
        code: 0,
        message: "Setting created successfully",
        payload: setting
    };
}, {requirePermission: 'settings:create'});

// Update a setting
export const updateSetting = secure(async (session: SessionData, request: MinimumRequest<any, Partial<SettingsEntryData>>, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const settingId = request._params?.id;
    const updates = request.body as Partial<SettingsEntryData>;

    if (!settingId) {
        throw new BadRequest("Setting ID is required");
    }

    const db = await extra.db();

    // Check if setting exists first
    const existingSetting = await db.settings.findOne({_id: settingId});
    if (!existingSetting) {
        throw new NotFound(`Setting with id ${settingId} not found`);
    }

    // Handle secure settings - if the existing setting is secure, encrypt the new value
    if (updates.value !== undefined && existingSetting.isSecure) {
        updates.value = encrypt(updates.value);
        updates.isSecure = true;
    }

    // Check if the key indicates this should be secure (for key updates)
    if (updates.key && isSecureKey(updates.key)) {
        updates.isSecure = true;
        if (updates.value !== undefined) {
            updates.value = encrypt(updates.value);
        }
    }

    // Execute before update hook
    let finalUpdates = updates;
    if (extra?.callHook) {
        const beforeResult = await extra.callHook('setting:beforeUpdate', {
            entity: 'setting',
            operation: 'update',
            id: settingId,
            data: updates,
            previousData: existingSetting
        });
        if (beforeResult?.data) {
            finalUpdates = beforeResult.data;
        }
    }

    // Update timestamp
    finalUpdates.updatedAt = Date.now();

    const setting = await db.settings.updateOne({_id: settingId}, finalUpdates);

    // Execute after update hook
    if (extra?.callHook) {
        await extra.callHook('setting:afterUpdate', {
            entity: 'setting',
            operation: 'update',
            id: settingId,
            data: setting,
            previousData: existingSetting
        });
    }

    return {
        code: 0,
        message: "Setting updated successfully",
        payload: setting
    };
}, {requirePermission: 'settings:update'});

// Delete a setting
export const deleteSetting = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const settingId = request._params?.id;

    if (!settingId) {
        throw new BadRequest("Setting ID is required");
    }

    const db = await extra.db();

    // Check if setting exists first
    const existingSetting = await db.settings.findOne({_id: settingId});
    if (!existingSetting) {
        throw new NotFound(`Setting with id ${settingId} not found`);
    }

    // Execute before delete hook
    if (extra?.callHook) {
        const beforeResult = await extra.callHook('setting:beforeDelete', {
            entity: 'setting',
            operation: 'delete',
            id: settingId,
            data: existingSetting
        });
        if (beforeResult?.cancel) {
            throw new BadRequest("Setting deletion cancelled by plugin");
        }
    }

    await db.settings.deleteOne({_id: settingId});

    // Execute after delete hook
    if (extra?.callHook) {
        await extra.callHook('setting:afterDelete', {
            entity: 'setting',
            operation: 'delete',
            id: settingId,
            previousData: existingSetting
        });
    }

    return {
        code: 0,
        message: "Setting deleted successfully",
        payload: {_id: settingId}
    };
}, {requireAnyPermission: ['settings:delete', 'all:delete']});