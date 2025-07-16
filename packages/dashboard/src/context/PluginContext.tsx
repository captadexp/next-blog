import {createContext, FunctionComponent, h} from 'preact';
import {useCallback, useContext, useEffect, useMemo, useState} from 'preact/hooks';
import {useUser} from "./UserContext.tsx";
import {Plugin, PluginHookMapping} from "../types/api.ts";
import {pluginCache} from "../utils/pluginCache.ts";
import {UIHookFn} from "../dashboard/components/plugins/types.ts";
import Logger, {LogLevel} from "../utils/Logger.ts";

const logger = new Logger('PluginSystem', LogLevel.INFO);

interface PluginContextType {
    status: 'idle' | 'initializing' | 'ready' | 'error';
    plugins: Plugin[];
    loadedPlugins: Map<string, PluginModule>;
    getHookFunctions: (hookName: string) => { pluginId: string, hookFn: UIHookFn }[];
    callHook: <T, R>(hookName: string, payload: T) => Promise<R>;
    reloadPlugins: () => Promise<void>;
    hardReloadPlugins: () => Promise<void>;
}

export interface PluginModule {
    // Plugin metadata
    name: string;
    version: string;
    description?: string;
    hasPanel?: boolean;

    // Hooks implementation
    hooks?: {
        [hookName: string]: (context: any) => Promise<any> | any;
    };
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export const PluginProvider: FunctionComponent = ({children}) => {
    const [status, setStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
    const {user, apis} = useUser();

    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [loadedPlugins, setLoadedPlugins] = useState<Map<string, PluginModule>>(new Map());
    const [hookMappings, setHookMappings] = useState<Map<string, PluginHookMapping[]>>(new Map());

    const loadPluginModule = useCallback(async (plugin: Plugin): Promise<[string, PluginModule] | null> => {
        logger.time(`Load plugin ${plugin.name}`);
        if (!plugin.client)
            throw new Error("No client side found for plugin");

        try {
            const url = plugin.client.url;
            let code = await pluginCache.get(url);
            if (!code) {
                logger.debug(`Fetching plugin from ${url}`);
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
                code = await response.text();
                await pluginCache.set(url, code);
                logger.debug(`Fetched and cached plugin ${plugin.name}`);
            } else {
                logger.debug(`Loaded plugin ${plugin.name} from cache`);
            }

            const blob = new Blob([`return ${code}`], {type: 'text/javascript'});
            const objectUrl = URL.createObjectURL(blob);
            const moduleFactory = new Function(await (await fetch(objectUrl)).text());
            URL.revokeObjectURL(objectUrl);
            const module = moduleFactory();
            if (!module || typeof module !== 'object') throw new Error(`Plugin ${plugin.name} did not return a valid module object.`);
            logger.info(`Successfully loaded plugin: ${plugin.name}`);
            return [plugin._id, module];
        } catch (error) {
            logger.error(`Failed to load plugin ${plugin.name}:`, error);
            return null;
        } finally {
            logger.timeEnd(`Load plugin ${plugin.name}`);
        }
    }, [apis]);

    const doLoadAll = useCallback(async () => {
        if (!user || !['idle', 'ready'].includes(status)) return;
        logger.time('Initialization');
        logger.info('Initializing...');
        setStatus('initializing');
        try {
            const [pluginsRes, mappingsRes] = await Promise.all([
                apis.getPlugins(),
                apis.getPluginHookMappings({type: 'client'}),
            ]);

            if (pluginsRes.code !== 0 || mappingsRes.code !== 0) throw new Error('Failed to fetch plugin metadata.');

            const pluginsToLoad = pluginsRes.payload || [];
            setPlugins(pluginsToLoad);
            const hookMappingsToLoad = mappingsRes.payload || [];
            logger.debug(`Found ${pluginsToLoad.length} plugins and ${hookMappingsToLoad.length} hook mappings.`);

            const mappings = new Map<string, PluginHookMapping[]>();
            for (const mapping of hookMappingsToLoad) {
                if (!mappings.has(mapping.hookName)) mappings.set(mapping.hookName, []);
                mappings.get(mapping.hookName)?.push(mapping);
            }
            for (const [hookName, m] of mappings.entries()) {
                m.sort((a, b) => a.priority - b.priority);
                mappings.set(hookName, m);
            }
            setHookMappings(mappings);
            logger.debug('Hook mappings processed.');

            const results = await Promise.all(pluginsToLoad.map(loadPluginModule));

            const newPlugins = new Map<string, PluginModule>();
            results.forEach(result => {
                if (result) newPlugins.set(result[0], result[1]);
            });

            setLoadedPlugins(newPlugins);
            setStatus('ready');
            logger.info(`Initialization complete. ${newPlugins.size} plugins loaded.`);
        } catch (error) {
            logger.error('Initialization failed:', error);
            setStatus('error');
        } finally {
            logger.timeEnd('Initialization');
        }
    }, [user, status, loadPluginModule]);

    const reloadPlugins = useCallback(async () => {
        try {
            await doLoadAll();
            logger.info('Plugins reloaded');
        } catch (err) {
            logger.error('reloadPlugins failed:', err);
            setStatus('error');
        }
    }, [doLoadAll]);

    const hardReloadPlugins = useCallback(async () => {
        await pluginCache.clear();
        await reloadPlugins();
    }, [reloadPlugins]);

    useEffect(() => {
        if (!user || status !== 'idle') return;
        doLoadAll()
            .catch(err => {
                logger.error('Initialization failed:', err);
                setStatus('error');
            });
    }, [doLoadAll]);

    const getHookFunctions = useCallback((hookName: string): { pluginId: string, hookFn: UIHookFn }[] => {
        logger.debug(`getHookFunctions called for hook: "${hookName}"`);
        const mappings = hookMappings.get(hookName) || [];
        if (mappings.length === 0) {
            logger.warn(`No mappings found for hook: "${hookName}"`);
        }

        const functions = mappings
            .map(mapping => {
                const plugin = loadedPlugins.get(mapping.pluginId);
                if (!plugin) {
                    logger.warn(`Plugin with ID ${mapping.pluginId} not found in loadedPlugins for hook "${hookName}"`);
                    return null;
                }

                const hookFn = plugin?.hooks?.[hookName];
                if (typeof hookFn === 'function') {
                    logger.debug(`Found hook function for plugin ${plugin.name} (${mapping.pluginId}) for hook "${hookName}"`);
                    return {pluginId: mapping.pluginId, hookFn};
                } else {
                    logger.warn(`Hook function for hook "${hookName}" not found or not a function in plugin ${plugin.name}`);
                }
                return null;
            })
            .filter((p): p is { pluginId: string; hookFn: UIHookFn } => p !== null);

        logger.debug(`Found ${functions.length} functions for hook: "${hookName}"`);
        return functions;
    }, [loadedPlugins, hookMappings]);

    const callHook = useCallback(async (hookName: string, payload: any): Promise<any> => {
        return apis.callPluginHook(hookName, payload);
    }, [apis]);

    const value = useMemo(() => ({
        status,
        plugins,
        loadedPlugins,
        getHookFunctions,
        callHook,
        reloadPlugins,
        hardReloadPlugins
    }), [status, plugins, loadedPlugins, getHookFunctions, callHook, reloadPlugins, hardReloadPlugins]);

    return <PluginContext.Provider value={value}>{children}</PluginContext.Provider>;
};

export const usePlugins = (): PluginContextType => {
    const context = useContext(PluginContext);
    if (!context) throw new Error('usePlugins must be used within a PluginProvider');
    return context;
};

