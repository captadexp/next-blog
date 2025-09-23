import secure, {CNextRequest} from "../utils/secureInternal.js";
import {BadRequest, DatabaseError, NotFound, Success, ValidationError} from "../utils/errors.js";

export const getSettings = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const sdk = request.sdk;

        try {
            let settings = await db.settings.find({});
            
            // Execute hook for list operation
            if (sdk?.callHook) {
                const hookResult = await sdk.callHook('setting:onList', {
                    entity: 'setting',
                    operation: 'list',
                    filters: {},
                    data: settings
                });
                if (hookResult?.data) {
                    settings = hookResult.data;
                }
            }
            
            throw new Success("Settings retrieved successfully", settings);
        } catch (error) {
            if (error instanceof Success) throw error;

            console.error("Error fetching settings:", error);
            throw new DatabaseError("Failed to retrieve settings: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'settings:list'}
);

export const getSettingById = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const sdk = request.sdk;

        try {
            let setting = await db.settings.findOne({_id: request._params.id});

            if (!setting) {
                throw new NotFound(`Setting with id ${request._params.id} not found`);
            }

            // Execute hook for read operation
            if (sdk?.callHook) {
                const hookResult = await sdk.callHook('setting:onRead', {
                    entity: 'setting',
                    operation: 'read',
                    id: request._params.id,
                    data: setting
                });
                if (hookResult?.data) {
                    setting = hookResult.data;
                }
            }

            throw new Success("Setting retrieved successfully", setting);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound) throw error;

            console.error(`Error fetching setting ${request._params.id}:`, error);
            throw new DatabaseError("Failed to retrieve setting: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'settings:read'}
);

export const createSetting = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const sdk = request.sdk;

        try {
            let data: any = await request.json();

            if (!data.key) {
                throw new ValidationError("Setting key is required");
            }

            if (data.value === undefined) {
                throw new ValidationError("Setting value is required");
            }

            if (!data.owner) {
                throw new ValidationError("Setting owner is required");
            }

            // Execute before create hook
            if (sdk?.callHook) {
                const beforeResult = await sdk.callHook('setting:beforeCreate', {
                    entity: 'setting',
                    operation: 'create',
                    data
                });
                if (beforeResult?.data) {
                    data = beforeResult.data;
                }
            }

            const creation = await db.settings.create({
                ...data,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });

            // Execute after create hook
            if (sdk?.callHook) {
                await sdk.callHook('setting:afterCreate', {
                    entity: 'setting',
                    operation: 'create',
                    id: creation._id,
                    data: creation
                });
            }

            request.configuration.callbacks?.on?.("createSettingsEntry", creation);
            throw new Success("Setting created successfully", creation);
        } catch (error) {
            if (error instanceof Success || error instanceof ValidationError) throw error;

            console.error("Error creating setting:", error);
            throw new DatabaseError("Failed to create setting: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'settings:create'}
);

export const updateSetting = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const sdk = request.sdk;

        try {
            let data: any = await request.json();

            // Check if setting exists first
            const existingSetting = await db.settings.findOne({_id: request._params.id});
            if (!existingSetting) {
                throw new NotFound(`Setting with id ${request._params.id} not found`);
            }

            // Execute before update hook
            if (sdk?.callHook) {
                const beforeResult = await sdk.callHook('setting:beforeUpdate', {
                    entity: 'setting',
                    operation: 'update',
                    id: request._params.id,
                    data,
                    previousData: existingSetting
                });
                if (beforeResult?.data) {
                    data = beforeResult.data;
                }
            }

            const updation = await db.settings.updateOne(
                {_id: request._params.id},
                {
                    ...data,
                    updatedAt: Date.now()
                }
            );

            // Execute after update hook
            if (sdk?.callHook) {
                await sdk.callHook('setting:afterUpdate', {
                    entity: 'setting',
                    operation: 'update',
                    id: request._params.id,
                    data: updation,
                    previousData: existingSetting
                });
            }

            request.configuration.callbacks?.on?.("updateSettingsEntry", updation);
            throw new Success("Setting updated successfully", updation);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound || error instanceof ValidationError) throw error;

            console.error(`Error updating setting ${request._params.id}:`, error);
            throw new DatabaseError("Failed to update setting: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'settings:update'}
);

export const deleteSetting = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const sdk = request.sdk;

        try {
            // Check if setting exists first
            const existingSetting = await db.settings.findOne({_id: request._params.id});
            if (!existingSetting) {
                throw new NotFound(`Setting with id ${request._params.id} not found`);
            }

            // Execute before delete hook
            if (sdk?.callHook) {
                const beforeResult = await sdk.callHook('setting:beforeDelete', {
                    entity: 'setting',
                    operation: 'delete',
                    id: request._params.id,
                    data: existingSetting
                });
                if (beforeResult?.cancel) {
                    throw new BadRequest("Setting deletion cancelled by plugin");
                }
            }

            const deletion = await db.settings.deleteOne({_id: request._params.id});

            // Execute after delete hook
            if (sdk?.callHook) {
                await sdk.callHook('setting:afterDelete', {
                    entity: 'setting',
                    operation: 'delete',
                    id: request._params.id,
                    previousData: existingSetting
                });
            }

            request.configuration.callbacks?.on?.("deleteSettingsEntry", deletion);
            throw new Success("Setting deleted successfully", deletion);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound) throw error;

            console.error(`Error deleting setting ${request._params.id}:`, error);
            throw new DatabaseError("Failed to delete setting: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requireAnyPermission: ['settings:delete', 'all:delete']}
);