import type {MinimumRequest, OneApiFunctionResponse, SessionData} from "@supergrowthai/oneapi";
import {BadRequest, NotFound} from "@supergrowthai/oneapi";
import type {SettingsEntryData} from "@supergrowthai/next-blog-types/server";
import {createId, SettingsEntry} from "@supergrowthai/next-blog-types/server";
import {PaginatedResponse, PaginationParams,} from "@supergrowthai/next-blog-types";
import secure from "../utils/secureInternal.js";
import type {ApiExtra} from "../types/api.js";
import {getSystemPluginId} from "../utils/defaultSettings.js";
import {encrypt, isSecureKey, maskValue} from "../utils/crypto.js";

// List all settings
export const getSettings = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = extra.sdk.db;
    const params = request.query as PaginationParams & { search?: string } | undefined;
    const systemPluginId = await getSystemPluginId(db);

    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 10;
    const search = params?.search || '';

    let filter: any = {};
    if (search) {
        filter = {$or: [{key: {$regex: search, $options: 'i'}}]};
    }

    const skip = (page - 1) * limit;
    let settings = await db.settings.find(filter, {skip, limit});

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
            const masked = typeof setting.value === 'string' ? maskValue(setting.value) : '********';
            maskedSetting = {...maskedSetting, value: masked, masked: true, isSecure: true};
        }

        return maskedSetting;
    });

    // Execute hook for list operation
    const hookResult = await extra.sdk.callHook('setting:onList', {
        entity: 'setting',
        operation: 'list',
        filters: filter,
        data: settings
    });
    if (hookResult?.data) {
        settings = hookResult.data;
    }

    const paginatedResponse: PaginatedResponse<SettingsEntry> = {
        data: settings,
        page,
        limit
    };

    return {
        code: 0,
        message: "Settings retrieved successfully",
        payload: paginatedResponse
    };
}, {requirePermission: 'settings:list'});

// Get a single setting by ID
export const getSettingById = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const settingId = request._params?.id;

    if (!settingId) {
        throw new BadRequest("Setting ID is required");
    }

    const db = extra.sdk.db;
    let setting = await db.settings.findOne({_id: settingId});

    if (!setting) {
        throw new NotFound(`Setting with id ${settingId} not found`);
    }

    // Mask secure values
    if (setting.isSecure) {
        const masked = typeof setting.value === 'string' ? maskValue(setting.value) : '********';
        setting = {...setting, value: masked, masked: true, isSecure: true};
    }


    // Execute hook for read operation
    const hookResult = await extra.sdk.callHook('setting:onRead', {
        entity: 'setting',
        operation: 'read',
        id: settingId,
        data: setting
    });
    if (hookResult?.data) {
        setting = hookResult.data;
    }

    return {
        code: 0,
        message: "Setting retrieved successfully",
        payload: setting
    };
}, {requirePermission: 'settings:read'});

// Create a new setting
export const createSetting = secure(async (session: SessionData, request: MinimumRequest<any, Partial<SettingsEntryData> & {
    scope?: 'global' | 'user',
    masked?: boolean
}>, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = extra.sdk.db;
    let settingData = request.body as Partial<SettingsEntryData> & { scope?: 'global' | 'user', masked?: boolean };

    if (!settingData.key) throw new BadRequest("Setting key is required");
    if (settingData.value === undefined) throw new BadRequest("Setting value is required");
    if (settingData.masked === true) throw new BadRequest("Masked placeholder not allowed for create");

    // Force secure if key looks secure (prevents accidental plaintext) — tiny policy hardening
    // (If you must keep "explicit choice wins", remove the next line.)
    if (isSecureKey(settingData.key)) settingData.isSecure = true;

    if (settingData.isSecure === undefined) settingData.isSecure = isSecureKey(settingData.key);

    const scope = settingData.scope || 'global';
    if (scope === 'user') {
        settingData.ownerId = createId.user(session.user._id);
        settingData.ownerType = 'user';
        settingData.key = `user:${session.user._id}:${settingData.key}`;
    } else {
        const systemPluginId = await getSystemPluginId(db);
        settingData.ownerId = createId.plugin(systemPluginId);
        settingData.ownerType = 'plugin';
    }

    if (settingData.isSecure) {
        settingData.value = encrypt(settingData.value as any);
    }

    delete (settingData as any).scope;
    delete (settingData as any).masked; // never persist

    const beforeResult = await extra.sdk.callHook('setting:beforeCreate', {
        entity: 'setting',
        operation: 'create',
        data: settingData
    });
    if (beforeResult?.data) settingData = beforeResult.data;

    settingData.createdAt = Date.now();
    settingData.updatedAt = Date.now();

    let setting = await db.settings.create(<SettingsEntryData>settingData);

    // Mask secure value in response
    if (setting?.isSecure) {
        setting = {
            ...setting,
            value: typeof setting.value === 'string' ? maskValue(setting.value) : '********',
            masked: true,
            isSecure: true
        };
    }

    await extra.sdk.callHook('setting:afterCreate', {
        entity: 'setting',
        operation: 'create',
        id: setting._id,
        data: setting
    });

    return {code: 0, message: "Setting created successfully", payload: setting};
}, {requirePermission: 'settings:create'});

// Update a setting
export const updateSetting = secure(async (session: SessionData, request: MinimumRequest<any, Partial<SettingsEntryData>>, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const settingId = request._params?.id;
    if (!settingId) throw new BadRequest("Setting ID is required");

    const db = extra.sdk.db;
    const existingSetting = await db.settings.findOne({_id: settingId});
    if (!existingSetting) throw new NotFound(`Setting with id ${settingId} not found`);

    // Allowlist fields only
    const reqBody = request.body as Partial<SettingsEntryData> & { masked?: boolean };
    const updates: Partial<SettingsEntryData> = {};
    if (typeof reqBody.key !== 'undefined') updates.key = reqBody.key;
    if (typeof reqBody.value !== 'undefined') updates.value = reqBody.value;

    // Ignore value if client signals it's masked (prevents double-encrypting mask text)
    if (reqBody.masked === true) {
        delete updates.value;
    }

    // Caller cannot toggle these
    delete (reqBody as any).isSecure;
    delete (reqBody as any).ownerId;
    delete (reqBody as any).ownerType;
    delete (reqBody as any).createdAt;

    // Handle secure settings
    const keyBecomesSecure = !!updates.key && isSecureKey(updates.key);
    const alreadySecure = !!existingSetting.isSecure;

    if (typeof updates.value !== 'undefined') {
        if (alreadySecure || keyBecomesSecure) {
            updates.isSecure = true;
            updates.value = encrypt(updates.value as any);
        }
    } else if (keyBecomesSecure) {
        // Encrypt existing plaintext if key change makes it secure
        updates.isSecure = true;
        updates.value = encrypt(existingSetting.value);
    }

    // Execute before update hook
    let finalUpdates = updates;
    const beforeResult = await extra.sdk.callHook('setting:beforeUpdate', {
        entity: 'setting',
        operation: 'update',
        id: settingId,
        data: updates,
        previousData: existingSetting
    });
    if (beforeResult?.data) finalUpdates = beforeResult.data;

    finalUpdates.updatedAt = Date.now();

    await db.settings.updateOne({_id: settingId}, finalUpdates);
    // Re-fetch the updated doc to return the actual record
    let setting = await db.settings.findOne({_id: settingId});

    // Mask secure values in response
    if (setting?.isSecure) {
        setting = {
            ...setting,
            value: typeof setting.value === 'string' ? maskValue(setting.value) : '********',
            masked: true,
            isSecure: true
        };
    }

    await extra.sdk.callHook('setting:afterUpdate', {
        entity: 'setting',
        operation: 'update',
        id: settingId,
        data: setting,
        previousData: existingSetting
    });

    return {code: 0, message: "Setting updated successfully", payload: setting};
}, {requirePermission: 'settings:update'});

// Delete a setting
export const deleteSetting = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const settingId = request._params?.id;

    if (!settingId) {
        throw new BadRequest("Setting ID is required");
    }

    const db = extra.sdk.db;

    // Check if setting exists first
    const existingSetting = await db.settings.findOne({_id: settingId});
    if (!existingSetting) {
        throw new NotFound(`Setting with id ${settingId} not found`);
    }

    // Execute before delete hook
    const beforeResult = await extra.sdk.callHook('setting:beforeDelete', {
        entity: 'setting',
        operation: 'delete',
        id: settingId,
        data: existingSetting
    });
    if (beforeResult?.cancel) {
        throw new BadRequest("Setting deletion cancelled by plugin");
    }

    await db.settings.deleteOne({_id: settingId});

    // Execute after delete hook
    await extra.sdk.callHook('setting:afterDelete', {
        entity: 'setting',
        operation: 'delete',
        id: settingId,
        previousData: existingSetting
    });

    return {
        code: 0,
        message: "Setting deleted successfully",
        payload: {_id: settingId}
    };
}, {requireAnyPermission: ['settings:delete', 'all:delete']});