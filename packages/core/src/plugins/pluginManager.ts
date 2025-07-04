import {DatabaseAdapter, Plugin, PluginModule} from "../types.js";
import {ValidationError} from "../utils/errors.js";
import Logger from "../utils/Logger.js";

const logger = new Logger('plugins-manager');

async function loadPluginFromUrl<T>(url: string): Promise<T> {
    if (!url) throw new ValidationError("Plugin url is required");

    logger.debug(`Fetching plugin from URL: ${url}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed for plugin: ${response.statusText}`);

    const code = await response.text();
    logger.debug('Plugin code fetched successfully');

    const blob = new Blob([`return ${code}`], {type: 'text/javascript'});
    const objectUrl = URL.createObjectURL(blob);
    const plugin: T = new Function(await (await fetch(objectUrl)).text())();
    URL.revokeObjectURL(objectUrl);
    logger.debug('Plugin module loaded');

    return plugin;
}

async function loadPluginManifest(url: string): Promise<Plugin> {
    if (!url) throw new ValidationError("Plugin url is required");
    logger.debug(`Fetching plugin manifest from URL: ${url}`);
    const manifest = await loadPluginFromUrl<Plugin>(url);
    if (!manifest.name || !manifest.version || !manifest.description) {
        logger.warn('Manifest missing required fields');
        throw new ValidationError("Plugin manifest is missing required fields (name, version, description)");
    }
    return manifest;
}

async function loadPluginModule(url: string): Promise<PluginModule> {
    logger.debug(`Loading plugin module from URL: ${url}`);
    return loadPluginFromUrl<PluginModule>(url);
}

async function registerHooks(
    db: DatabaseAdapter,
    pluginId: string,
    hooks: Record<string, Function> | undefined,
    type: 'server' | 'client'
): Promise<void> {
    if (!hooks || typeof hooks !== 'object') return;
    logger.debug(`Registering ${type} hooks for plugin ${pluginId}`);
    for (const hookName of Object.keys(hooks)) {
        await db.pluginHookMappings.create({pluginId, hookName, type, priority: 10});
        logger.debug(`Registered ${type} hook: ${hookName}`);
    }
}

async function registerRpcs(
    db: DatabaseAdapter,
    pluginId: string,
    rpcs: Record<string, Function> | undefined
): Promise<void> {
    if (!rpcs || typeof rpcs !== 'object') return;
    logger.debug(`Registering RPCs for plugin ${pluginId}`);
    for (const rpcName of Object.keys(rpcs)) {
        await db.pluginHookMappings.create({pluginId, hookName: rpcName, type: 'rpc', priority: 10});
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
    const creation = await db.plugins.create({...manifest, url});
    logger.info(`Plugin created: ${creation._id}`);

    if (manifest.server?.url) {
        const server = await loadPluginModule(manifest.server?.url);
        await registerHooks(db, creation._id, server.hooks, 'server');
        await registerRpcs(db, creation._id, server.rpcs);
    }
    if (manifest.client?.url) {
        const client = await loadPluginModule(manifest.client?.url);
        await registerHooks(db, creation._id, client.hooks, 'client');
    }
    return creation;
}


export default {
    loadPluginFromUrl,
    loadPluginManifest,
    loadPluginModule,
    deletePluginAndMappings,
    installPlugin
}