import {createId, DatabaseAdapter, PluginManifest, ServerPluginModule} from "@supergrowthai/next-blog-types/server";
import {ValidationError} from "../utils/errors.js";
import {Logger} from "@supergrowthai/utils";
import {readInternalPluginFile} from "../utils/dashboardAssets.js";
import {INTERNAL_PLUGINS} from "./internalPlugins.js";

const logger = new Logger('plugins-manager');

async function loadPluginFromUrl<T>(url: string): Promise<T> {
    if (!url) throw new ValidationError("Plugin url is required");

    let code: string;

    if (url.startsWith('internal://')) {
        const fileContent = readInternalPluginFile(url);
        if (!fileContent) {
            throw new Error(`Internal plugin file not found: ${url}`);
        }

        logger.debug(`Loading internal plugin from filesystem: ${url}`);
        code = fileContent;
    } else {
        logger.debug(`Fetching plugin from URL: ${url}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Fetch failed for plugin: ${response.statusText}`);
        code = await response.text();
    }
    logger.debug('Plugin code fetched successfully');

    const blob = new Blob([`return ${code}`], {type: 'text/javascript'});
    const objectUrl = URL.createObjectURL(blob);
    const plugin: T = new Function(await (await fetch(objectUrl)).text())();
    URL.revokeObjectURL(objectUrl);
    logger.debug('Plugin module loaded');

    return plugin;
}

async function loadPluginManifest(url: string): Promise<PluginManifest> {
    if (!url) throw new ValidationError("Plugin url is required");
    logger.debug(`Fetching plugin manifest from URL: ${url}`);
    const manifest = await loadPluginFromUrl<PluginManifest>(url);
    if (!manifest.name || !manifest.version || !manifest.description) {
        logger.warn('Manifest missing required fields');
        throw new ValidationError("Plugin manifest is missing required fields (name, version, description)");
    }
    return manifest;
}

async function loadPluginModule<T>(url: string): Promise<T> {
    logger.debug(`Loading plugin module from URL: ${url}`);
    return loadPluginFromUrl<T>(url);
}

async function registerHooks(
    db: DatabaseAdapter,
    pluginId: string,
    hooks: Record<string, Function | undefined> | undefined,
    type: 'server' | 'client'
): Promise<void> {
    if (!hooks || typeof hooks !== 'object') return;
    logger.debug(`Registering ${type} hooks for plugin ${pluginId}`);
    for (const hookName of Object.keys(hooks)) {
        if (hooks[hookName]) { // Only register if the hook function exists
            await db.pluginHookMappings.create({pluginId: createId.plugin(pluginId), hookName, type, priority: 10});
            logger.debug(`Registered ${type} hook: ${hookName}`);
        }
    }
}

async function registerRpcs(
    db: DatabaseAdapter,
    pluginId: string,
    rpcs: Record<string, Function | undefined> | undefined
): Promise<void> {
    if (!rpcs || typeof rpcs !== 'object') return;
    logger.debug(`Registering RPCs for plugin ${pluginId}`);
    for (const rpcName of Object.keys(rpcs)) {
        await db.pluginHookMappings.create({
            pluginId: createId.plugin(pluginId),
            hookName: rpcName,
            type: 'rpc',
            priority: 10
        });
        logger.debug(`Registered rpc: ${rpcName}`);
    }
}

async function deletePluginAndMappings(db: DatabaseAdapter, pluginId: string): Promise<void> {
    logger.debug(`Deleting plugin and mappings for ID: ${pluginId}`);
    await db.pluginHookMappings.delete({pluginId});
    await db.plugins.deleteOne({_id: pluginId});
}

async function installPlugin(db: DatabaseAdapter, url: string): Promise<any> {
    const manifest = await loadPluginManifest(url);

    // Check for existing plugin with same manifest ID
    const existing = await db.plugins.findOne({id: manifest.id});
    if (existing) {
        throw new ValidationError(`Plugin with id '${manifest.id}' is already installed`);
    }

    // Internal plugins (internal://) are system plugins unless in devMode
    const isInternalPlugin = url.startsWith('internal://');
    const isSystem = isInternalPlugin && !manifest.devMode;

    const creation = await db.plugins.create({
        ...manifest,
        url,
        devMode: !!manifest.devMode,
        isSystem
    });

    logger.info(`Plugin created: ${creation._id}${manifest.devMode ? ' (devMode enabled)' : ''}${isSystem ? ' (system)' : ''}`);

    if (manifest.server?.url) {
        const server: ServerPluginModule = await loadPluginModule(manifest.server?.url);
        await registerHooks(db, creation._id, server.hooks, 'server');
        await registerRpcs(db, creation._id, server.rpcs);
    }
    // Client modules are loaded in the browser, not on server
    return creation;
}

async function updatePlugin(db: DatabaseAdapter, manifestId: string, url: string): Promise<any> {
    // Find existing plugin by manifest ID
    const existing = await db.plugins.findOne({id: manifestId});
    if (!existing) {
        throw new ValidationError(`Plugin with id '${manifestId}' is not installed`);
    }

    // Load new manifest from URL
    const newManifest = await loadPluginManifest(url);

    // Verify manifest ID hasn't changed
    if (newManifest.id !== manifestId) {
        throw new ValidationError(`New plugin manifest ID (${newManifest.id}) does not match expected ID (${manifestId})`);
    }

    const installationId = existing._id;
    const oldVersion = existing.version;
    const newVersion = newManifest.version;

    logger.info(`Updating plugin ${manifestId} from v${oldVersion} to v${newVersion}`);

    // Delete old hook mappings
    await db.pluginHookMappings.delete({pluginId: installationId});

    // Update plugin record
    await db.plugins.updateOne(
        {_id: installationId},
        {
            ...newManifest,
            url,
            devMode: !!newManifest.devMode,
            updatedAt: new Date()
        }
    );

    // Register new hooks if server module exists
    if (newManifest.server?.url) {
        const server: ServerPluginModule = await loadPluginModule(newManifest.server?.url);
        await registerHooks(db, installationId, server.hooks, 'server');
        await registerRpcs(db, installationId, server.rpcs);
    }

    logger.info(`Plugin ${manifestId} updated successfully`);

    return db.plugins.findOne({_id: installationId});
}

async function installAllInternalPlugins(db: DatabaseAdapter): Promise<void> {
    logger.info('Installing all internal plugins...');

    // Get all internal plugin IDs
    const internalPluginIds = Object.keys(INTERNAL_PLUGINS);

    // Fetch all existing internal plugins in a single query
    const existingPlugins = await db.plugins.find({
        id: {$in: internalPluginIds}
    });

    // Create a Set of existing plugin IDs for quick lookup
    const existingPluginIds = new Set(existingPlugins.map(p => p.id));

    // Find plugins that need to be installed
    const toInstall: Array<[string, string]> = [];
    for (const [pluginId, url] of Object.entries(INTERNAL_PLUGINS)) {
        if (!existingPluginIds.has(pluginId)) {
            toInstall.push([pluginId, url]);
        }
    }

    // Install missing plugins
    if (toInstall.length > 0) {
        logger.info(`Installing ${toInstall.length} internal plugins...`);
        for (const [pluginId, url] of toInstall) {
            try {
                logger.info(`Installing internal plugin: ${pluginId}`);
                await installPlugin(db, url);
            } catch (error) {
                logger.error(`Failed to install internal plugin ${pluginId}:`, error);
            }
        }
    } else {
        logger.info('All internal plugins already installed');
    }

    logger.info('Internal plugins installation complete');
}

async function updateInternalPlugins(db: DatabaseAdapter): Promise<void> {
    logger.info('Syncing all internal plugins (install new, update existing)...');

    // Get all internal plugin IDs
    const internalPluginIds = Object.keys(INTERNAL_PLUGINS);

    // Fetch all existing internal plugins in a single query
    const existingPlugins = await db.plugins.find({
        id: {$in: internalPluginIds}
    });

    // Create a Set of existing plugin IDs for quick lookup
    const existingPluginIds = new Set(existingPlugins.map(p => p.id));

    // Separate plugins into install and update lists
    const toInstall: Array<[string, string]> = [];
    const toUpdate: Array<[string, string]> = [];

    for (const [pluginId, url] of Object.entries(INTERNAL_PLUGINS)) {
        if (existingPluginIds.has(pluginId)) {
            toUpdate.push([pluginId, url]);
        } else {
            toInstall.push([pluginId, url]);
        }
    }

    // Install new plugins
    if (toInstall.length > 0) {
        logger.info(`Installing ${toInstall.length} new internal plugins...`);
        for (const [pluginId, url] of toInstall) {
            try {
                logger.info(`Installing internal plugin: ${pluginId}`);
                await installPlugin(db, url);
            } catch (error) {
                logger.error(`Failed to install internal plugin ${pluginId}:`, error);
            }
        }
    }

    // Update existing plugins
    if (toUpdate.length > 0) {
        logger.info(`Updating ${toUpdate.length} existing internal plugins...`);
        for (const [pluginId, url] of toUpdate) {
            try {
                logger.info(`Updating internal plugin: ${pluginId}`);
                await updatePlugin(db, pluginId, url);
            } catch (error) {
                logger.error(`Failed to update internal plugin ${pluginId}:`, error);
            }
        }
    }

    logger.info(`Internal plugins sync complete: ${toInstall.length} installed, ${toUpdate.length} updated`);
}


export default {
    loadPluginFromUrl,
    loadPluginManifest,
    loadPluginModule,
    deletePluginAndMappings,
    installPlugin,
    updatePlugin,
    installAllInternalPlugins,
    updateInternalPlugins,
    registerHooks,
    registerRpcs
}