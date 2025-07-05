import {createContext, FunctionComponent, h} from 'preact';
import {useCallback, useContext, useEffect, useMemo, useState} from 'preact/hooks';
import {useUser} from "./UserContext.tsx";
import {Plugin, PluginHookMapping} from "../types/api.ts";
import {pluginCache} from "../utils/pluginCache.ts";
import {UIHookFn} from "../dashboard/components/plugins/types.ts";


interface PluginContextType {
    status: 'idle' | 'initializing' | 'ready' | 'error';
    getHookFunctions: (hookName: string) => { pluginId: string, hookFn: UIHookFn }[];
    callHook: <T, R>(hookName: string, payload: T) => Promise<R>;
}

export interface PluginModule {
    // Plugin metadata
    name: string;
    version: string;
    description?: string;

    // Hooks implementation
    hooks?: {
        [hookName: string]: (context: any) => Promise<any> | any;
    };
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export const PluginProvider: FunctionComponent = ({children}) => {
    const [status, setStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
    const {user, apis} = useUser();

    const [loadedPlugins, setLoadedPlugins] = useState<Map<string, PluginModule>>(new Map());
    const [hookMappings, setHookMappings] = useState<Map<string, PluginHookMapping[]>>(new Map());

    const loadPluginModule = useCallback(async (plugin: Plugin): Promise<[string, PluginModule] | null> => {
        console.time(`[PluginSystem] Load plugin ${plugin.name}`);
        if (!plugin.client)
            throw new Error("[PluginSystem] No client side found for plugin");

        try {
            const url = plugin.client.url;
            let code = await pluginCache.get(url);
            if (!code) {
                console.debug(`[PluginSystem] Fetching plugin from ${url}`);
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
                code = await response.text();
                await pluginCache.set(url, code);
                console.debug(`[PluginSystem] Fetched and cached plugin ${plugin.name}`);
            } else {
                console.debug(`[PluginSystem] Loaded plugin ${plugin.name} from cache`);
            }

            const blob = new Blob([`return ${code}`], {type: 'text/javascript'});
            const objectUrl = URL.createObjectURL(blob);
            const module = new Function(await (await fetch(objectUrl)).text())();
            URL.revokeObjectURL(objectUrl);
            if (!module || typeof module !== 'object') throw new Error(`Plugin ${plugin.name} did not return a valid module object.`);
            console.info(`[PluginSystem] Successfully loaded plugin: ${plugin.name}`);
            return [plugin._id, module];
        } catch (error) {
            console.error(`[PluginSystem] Failed to load plugin ${plugin.name}:`, error);
            return null;
        } finally {
            console.timeEnd(`[PluginSystem] Load plugin ${plugin.name}`);
        }
    }, [apis]);

    useEffect(() => {
        const initialize = async () => {
            if (!user || status !== 'idle') return;
            console.time('[PluginSystem] Initialization');
            console.info('[PluginSystem] Initializing...');
            setStatus('initializing');
            try {
                const [pluginsRes, mappingsRes] = await Promise.all([
                    apis.getPlugins(),
                    apis.getPluginHookMappings({type: 'client'}),
                ]);

                if (pluginsRes.code !== 0 || mappingsRes.code !== 0) throw new Error('Failed to fetch plugin metadata.');

                const pluginsToLoad = pluginsRes.payload || [];
                const hookMappingsToLoad = mappingsRes.payload || [];
                console.debug(`[PluginSystem] Found ${pluginsToLoad.length} plugins and ${hookMappingsToLoad.length} hook mappings.`);

                const mappings = new Map<string, PluginHookMapping[]>();
                for (const mapping of hookMappingsToLoad) {
                    if (!mappings.has(mapping.hookName)) mappings.set(mapping.hookName, []);
                    mappings.get(mapping.hookName)?.push(mapping);
                }
                for (const [hookName, m] of mappings.entries()) {
                    mappings.set(hookName, m.sort((a, b) => a.priority - b.priority));
                }
                setHookMappings(mappings);
                console.debug('[PluginSystem] Hook mappings processed.');

                const results = await Promise.all(pluginsToLoad.map(loadPluginModule));

                const newPlugins = new Map<string, PluginModule>();
                results.forEach(result => {
                    if (result) newPlugins.set(result[0], result[1]);
                });

                setLoadedPlugins(newPlugins);
                setStatus('ready');
                console.info(`[PluginSystem] Initialization complete. ${newPlugins.size} plugins loaded.`);
            } catch (error) {
                console.error('[PluginSystem] Initialization failed:', error);
                setStatus('error');
            } finally {
                console.timeEnd('[PluginSystem] Initialization');
            }
        };
        initialize();
    }, [user, status, apis, loadPluginModule]);

    const getHookFunctions = useCallback((hookName: string): { pluginId: string, hookFn: UIHookFn }[] => {
        console.debug(`[PluginSystem] getHookFunctions called for hook: "${hookName}"`);
        const mappings = hookMappings.get(hookName) || [];
        if (mappings.length === 0) {
            console.warn(`[PluginSystem] No mappings found for hook: "${hookName}"`);
        }

        const functions = mappings
            .map(mapping => {
                const plugin = loadedPlugins.get(mapping.pluginId);
                if (!plugin) {
                    console.warn(`[PluginSystem] Plugin with ID ${mapping.pluginId} not found in loadedPlugins for hook "${hookName}"`);
                    return null;
                }

                const hookFn = plugin?.hooks?.[hookName];
                if (typeof hookFn === 'function') {
                    console.debug(`[PluginSystem] Found hook function for plugin ${plugin.name} (${mapping.pluginId}) for hook "${hookName}"`);
                    return {pluginId: mapping.pluginId, hookFn};
                } else {
                    console.warn(`[PluginSystem] Hook function for hook "${hookName}" not found or not a function in plugin ${plugin.name}`);
                }
                return null;
            })
            .filter((p): p is { pluginId: string; hookFn: UIHookFn } => p !== null);

        console.debug(`[PluginSystem] Found ${functions.length} functions for hook: "${hookName}"`);
        return functions;
    }, [loadedPlugins, hookMappings]);

    const callHook = useCallback(async (hookName: string, payload: any): Promise<any> => {
        return apis.callPluginHook(hookName, payload);
    }, [apis]);

    const value = useMemo(() => ({
        status,
        getHookFunctions,
        callHook,
    }), [status, getHookFunctions, callHook]);

    return <PluginContext.Provider value={value}>{children}</PluginContext.Provider>;
};

export const usePlugins = (): PluginContextType => {
    const context = useContext(PluginContext);
    if (!context) throw new Error('usePlugins must be used within a PluginProvider');
    return context;
};

