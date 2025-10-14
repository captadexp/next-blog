import type {MinimumRequest, OneApiFunctionResponse, SessionData} from "@supergrowthai/oneapi";
import type {ApiExtra} from "../types/api.js";

// 5-minute cron job
export async function cron5Minute(session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> {
    const db = await extra.db();
    const tasks: any[] = [];

    // Execute hook for 5-minute cron
    if (extra?.callHook) {
        const result = await extra.callHook('cron:5-minute', {
            timestamp: Date.now()
        });
        if (result) {
            tasks.push({task: '5minute-hook', result});
        }
    }

    return {
        code: 0,
        message: "5-minute cron executed successfully",
        payload: {
            executedAt: Date.now(),
            tasks
        }
    };
}

// Hourly cron job
export async function cronHourly(session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> {
    const db = await extra.db();
    const tasks: any[] = [];

    // Clean up old sessions or temporary data
    // Example: Remove expired tokens, clean cache, etc.

    // Execute hook for hourly cron
    if (extra?.callHook) {
        const result = await extra.callHook('cron:hourly', {
            timestamp: Date.now()
        });
        if (result) {
            tasks.push({task: 'hourly-hook', result});
        }
    }

    return {
        code: 0,
        message: "Hourly cron executed successfully",
        payload: {
            executedAt: Date.now(),
            tasks
        }
    };
}

// Daily cron job
export async function cronDaily(session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> {
    const db = await extra.db();
    const tasks: any[] = [];

    // Daily maintenance tasks
    // Example: Generate reports, backup, cleanup old data, etc.

    // Execute hook for daily cron
    if (extra?.callHook) {
        const result = await extra.callHook('cron:daily', {
            timestamp: Date.now()
        });
        if (result) {
            tasks.push({task: 'daily-hook', result});
        }
    }

    // Clean up old data (example: delete drafts older than 30 days)
    // TODO: Implement batch delete functionality in database adapter
    // const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    // const deletedDrafts = await db.blogs.deleteMany({
    //     status: 'draft',
    //     updatedAt: {$lt: thirtyDaysAgo}
    // });
    // if (deletedDrafts.deletedCount > 0) {
    //     tasks.push({
    //         task: 'cleanup-drafts',
    //         deletedCount: deletedDrafts.deletedCount
    //     });
    // }

    return {
        code: 0,
        message: "Daily cron executed successfully",
        payload: {
            executedAt: Date.now(),
            tasks
        }
    };
}