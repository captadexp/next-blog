import {createContext, FunctionComponent, h} from 'preact';
import {useCallback, useContext, useEffect, useMemo, useState} from 'preact/hooks';
import {useUser} from "./UserContext.tsx";
import {PluginHookMapping} from "../types/api.ts";
import {pluginCache} from "../utils/pluginCache.ts";
import {UIHookFn} from "../dashboard/components/plugins/types.ts";


interface PluginContextType {
    status: 'idle' | 'initializing' | 'ready' | 'error';
    getHookFunctions: (hookName: string) => { pluginId: string, hookFn: UIHookFn }[];
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

export type PluginType = 'external' | 'lite' | 'browser';

export interface Plugin {
    _id: string;
    name: string;
    description: string;
    version: string;
    type: PluginType;
    entryPoint: string;
    author: string;
    createdAt: number;
    updatedAt: number;
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export const PluginProvider: FunctionComponent = ({children}) => {
    const [status, setStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
    const {user, apis} = useUser();

    const [loadedPlugins, setLoadedPlugins] = useState<Map<string, PluginModule>>(new Map());
    const [hookMappings, setHookMappings] = useState<Map<string, PluginHookMapping[]>>(new Map());


    const loadPluginModule = useCallback(async (plugin: Plugin): Promise<[string, PluginModule] | null> => {
        try {
            const url = plugin.entryPoint;
            let code = await pluginCache.get(url);
            if (!code) {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
                code = await response.text();
                await pluginCache.set(url, code);
            }

            const blob = new Blob([`return ${code}`], {type: 'text/javascript'});
            const objectUrl = URL.createObjectURL(blob);
            const module = new Function(await (await fetch(objectUrl)).text())();
            URL.revokeObjectURL(objectUrl);
            if (!module || typeof module !== 'object') throw new Error(`Plugin ${plugin.name} did not return a valid module object.`);
            return [plugin._id, module];
        } catch (error) {
            console.error(`[PluginSystem] Failed to load plugin ${plugin.name}:`, error);
            return null;
        }
    }, [apis]);

    useEffect(() => {
        const initialize = async () => {
            if (!user || status !== 'idle') return;
            setStatus('initializing');
            try {
                const [pluginsRes, mappingsRes] = await Promise.all([
                    apis.getPlugins(),
                    apis.getPluginHookMappings(),
                ]);

                if (pluginsRes.code !== 0 || mappingsRes.code !== 0) throw new Error('Failed to fetch plugin metadata.');

                const pluginsToLoad = pluginsRes.payload || [];
                const hookMappingsToLoad = mappingsRes.payload || [];

                const mappings = new Map<string, PluginHookMapping[]>();
                for (const mapping of hookMappingsToLoad) {
                    if (!mappings.has(mapping.hookName)) mappings.set(mapping.hookName, []);
                    mappings.get(mapping.hookName)?.push(mapping);
                }
                for (const [hookName, m] of mappings.entries()) {
                    mappings.set(hookName, m.sort((a, b) => a.priority - b.priority));
                }
                setHookMappings(mappings);

                const browserPlugins = pluginsToLoad.filter(p => p.type === 'browser');
                const results = await Promise.all(browserPlugins.map(loadPluginModule));

                const newPlugins = new Map<string, PluginModule>();
                results.forEach(result => {
                    if (result) newPlugins.set(result[0], result[1]);
                });

                setLoadedPlugins(newPlugins);
                setStatus('ready');
            } catch (error) {
                console.error('[PluginSystem] Initialization failed:', error);
                setStatus('error');
            }
        };
        initialize();
    }, [user, status, apis, loadPluginModule]);

    const getHookFunctions = useCallback((hookName: string): { pluginId: string, hookFn: UIHookFn }[] => {
        const mappings = hookMappings.get(hookName) || [];
        return mappings
            .map(mapping => {
                const plugin = loadedPlugins.get(mapping.pluginId);
                const hookFn = plugin?.hooks?.[hookName];
                if (typeof hookFn === 'function') {
                    return {pluginId: mapping.pluginId, hookFn};
                }
                return null;
            })
            .filter((p): p is { pluginId: string; hookFn: UIHookFn } => p !== null);
    }, [loadedPlugins, hookMappings]);

    const value = useMemo(() => ({
        status,
        getHookFunctions,
    }), [status, getHookFunctions]);

    return <PluginContext.Provider value={value}>{children}</PluginContext.Provider>;
};

export const usePlugins = (): PluginContextType => {
    const context = useContext(PluginContext);
    if (!context) throw new Error('usePlugins must be used within a PluginProvider');
    return context;
};