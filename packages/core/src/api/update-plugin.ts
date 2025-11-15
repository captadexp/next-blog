import type {MinimumRequest, OneApiFunctionResponse, SessionData} from "@supergrowthai/oneapi";
import {BadRequest, NotFound} from "@supergrowthai/oneapi";
import {ServerPluginModule} from "@supergrowthai/next-blog-types/server";
import secure from "../utils/secureInternal.js";
import type {ApiExtra} from "../types/api.js";
import pluginExecutor from "../plugins/plugin-executor.server.js";
import pluginManager from "../plugins/pluginManager.js";
import {Logger, LogLevel} from "@supergrowthai/utils";

const logger = new Logger('update-plugin', LogLevel.ERROR);

export const updatePlugin = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const installationId = request._params?.id;
    const body = request.body as { manifestId?: string; url?: string } | undefined;

    logger.time(`Update plugin ${installationId}`);
    logger.info(`Attempting to update plugin for installation ID: ${installationId}`);

    try {
        if (!installationId) {
            throw new BadRequest("Installation ID is required");
        }

        const db = extra.sdk.db;

        // Fetch existing plugin by installation ID
        const existing = await db.plugins.findOne({_id: installationId});

        if (!existing) {
            logger.warn(`Update failed, plugin not found: ${installationId}`);
            throw new NotFound(`Plugin with installation id ${installationId} not found`);
        }

        // Prevent update of system plugin
        if (existing.isSystem) {
            throw new BadRequest("System plugin cannot be updated");
        }

        // Use provided URL or existing URL
        const pluginUrl = body?.url || existing.url;
        const expectedManifestId = body?.manifestId || existing.id;

        // Verify manifest ID matches if provided
        if (body?.manifestId && existing.id !== body.manifestId) {
            throw new BadRequest(`Manifest ID mismatch. Expected ${existing.id}, got ${body.manifestId}`);
        }

        // Fetch and validate new plugin manifest
        const newManifest = await pluginManager.loadPluginManifest(pluginUrl);

        // Verify manifest ID hasn't changed
        if (newManifest.id !== expectedManifestId) {
            throw new BadRequest(`New plugin manifest ID (${newManifest.id}) does not match expected ID (${expectedManifestId})`);
        }

        // Store old version for hook callback
        const oldVersion = existing.version;
        const newVersion = newManifest.version;

        // Begin atomic update operation
        // 1. Delete old hook mappings
        await db.pluginHookMappings.delete({pluginId: installationId});

        // 2. Update plugin record with new manifest data
        await db.plugins.updateOne(
            {_id: installationId},
            {
                ...newManifest,
                url: pluginUrl,
                devMode: !!newManifest.devMode,
                updatedAt: new Date()
            }
        );

        // 3. Register new hooks if server module exists
        if (newManifest.server?.url) {
            const server: ServerPluginModule = await pluginManager.loadPluginModule(newManifest.server.url);
            await pluginManager.registerHooks(db, installationId, server.hooks, 'server');
            await pluginManager.registerRpcs(db, installationId, server.rpcs);
        }

        // 4. Call plugin:update hook on the updated plugin
        try {
            await pluginExecutor.executeHook(`plugin:update:${newManifest.id}`, extra.sdk, {
                oldVersion,
                newVersion,
                installationId
            });
        } catch (hookError) {
            logger.warn(`plugin:update hook failed for ${newManifest.id}:`, hookError);
            // Hook failure should not fail the entire update
        }

        // Reset plugin executor cache
        pluginExecutor.initialized = false;

        // Fetch and return updated plugin
        const updatedPlugin = await db.plugins.findOne({_id: installationId});

        logger.info(`Plugin ${installationId} updated successfully from v${oldVersion} to v${newVersion}`);

        return {
            code: 0,
            message: "Plugin code updated successfully",
            payload: updatedPlugin
        };

    } catch (error) {
        logger.error(`Failed to update plugin ${installationId}:`, error);
        throw error;
    } finally {
        logger.timeEnd(`Update plugin ${installationId}`);
    }
}, {requirePermission: 'plugins:create'});