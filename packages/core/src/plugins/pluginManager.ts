import {createId, DatabaseAdapter, PluginManifest, ServerPluginModule} from "@supergrowthai/next-blog-types/server";
import {ValidationError} from "../utils/errors.js";
import Logger from "../utils/Logger.js";
import {readInternalPluginFile} from "../utils/dashboardAssets.js";

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

    const creation = await db.plugins.create({
        ...manifest,
        url,
        devMode: !!manifest.devMode
    });
    logger.info(`Plugin created: ${creation._id}${manifest.devMode ? ' (devMode enabled)' : ''}`);

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


export default {
    loadPluginFromUrl,
    loadPluginManifest,
    loadPluginModule,
    deletePluginAndMappings,
    installPlugin,
    updatePlugin,
    registerHooks,
    registerRpcs
}