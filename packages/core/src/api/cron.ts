import {CronPayload} from "@supergrowthai/types/server";
import {type CNextRequest} from "../utils/secureInternal.js";
import {Success} from "../utils/errors.js";

// 5-minute cron endpoint
export const cron5Minute = async (request: CNextRequest) => {
    const sdk = request.sdk;

    const payload: CronPayload = {
        executedAt: new Date(),
        interval: '5-minute',
        metadata: {}
    };

    try {
        // Execute hook for 5-minute cron
        if (sdk?.callHook) {
            await sdk.callHook('cron:5-minute', payload);
        }

        throw new Success("5-minute cron executed successfully", {
            executed: true,
            timestamp: payload.executedAt
        });
    } catch (error) {
        if (error instanceof Success) throw error;

        console.error("Error executing 5-minute cron:", error);
        throw new Success("5-minute cron executed with errors", {
            executed: true,
            timestamp: payload.executedAt,
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Hourly cron endpoint
export const cronHourly = async (request: CNextRequest) => {
    const sdk = request.sdk;

    const payload: CronPayload = {
        executedAt: new Date(),
        interval: 'hourly',
        metadata: {}
    };

    try {
        // Execute hook for hourly cron
        if (sdk?.callHook) {
            await sdk.callHook('cron:hourly', payload);
        }

        throw new Success("Hourly cron executed successfully", {
            executed: true,
            timestamp: payload.executedAt
        });
    } catch (error) {
        if (error instanceof Success) throw error;

        console.error("Error executing hourly cron:", error);
        throw new Success("Hourly cron executed with errors", {
            executed: true,
            timestamp: payload.executedAt,
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Daily cron endpoint
export const cronDaily = async (request: CNextRequest) => {
    const sdk = request.sdk;

    const payload: CronPayload = {
        executedAt: new Date(),
        interval: 'daily',
        metadata: {}
    };

    try {
        // Execute hook for daily cron
        if (sdk?.callHook) {
            await sdk.callHook('cron:daily', payload);
        }

        throw new Success("Daily cron executed successfully", {
            executed: true,
            timestamp: payload.executedAt
        });
    } catch (error) {
        if (error instanceof Success) throw error;

        console.error("Error executing daily cron:", error);
        throw new Success("Daily cron executed with errors", {
            executed: true,
            timestamp: payload.executedAt,
            error: error instanceof Error ? error.message : String(error)
        });
    }
};