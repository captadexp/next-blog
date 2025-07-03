import {CNextRequest} from "../utils/secureInternal.js";
import secure from "../utils/secureInternal.js";
import {
    NotFound,
    Success,
    ValidationError,
    DatabaseError
} from "../utils/errors.js";

export const getSettings = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            const settings = await db.settings.find({});
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

        try {
            const setting = await db.settings.findOne({_id: request._params.id});

            if (!setting) {
                throw new NotFound(`Setting with id ${request._params.id} not found`);
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

        try {
            const data: any = await request.json();

            if (!data.key) {
                throw new ValidationError("Setting key is required");
            }

            if (data.value === undefined) {
                throw new ValidationError("Setting value is required");
            }

            if (!data.owner) {
                throw new ValidationError("Setting owner is required");
            }

            const creation = await db.settings.create({
                ...data,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
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

        try {
            const data: any = await request.json();

            // Check if setting exists first
            const existingSetting = await db.settings.findOne({_id: request._params.id});
            if (!existingSetting) {
                throw new NotFound(`Setting with id ${request._params.id} not found`);
            }

            const updation = await db.settings.updateOne(
                {_id: request._params.id},
                {
                    ...data,
                    updatedAt: Date.now()
                }
            );
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

        try {
            // Check if setting exists first
            const existingSetting = await db.settings.findOne({_id: request._params.id});
            if (!existingSetting) {
                throw new NotFound(`Setting with id ${request._params.id} not found`);
            }

            const deletion = await db.settings.deleteOne({_id: request._params.id});
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