import {createContext, FunctionComponent, h} from 'preact';
import {useCallback, useContext, useEffect, useMemo, useState} from 'preact/hooks';
import {useUser} from "./UserContext.tsx";
import {matchesHookPattern, Plugin, UIHookFn} from '@supergrowthai/types';
import {pluginCache} from "../utils/pluginCache.ts";
import Logger, {LogLevel} from "../utils/Logger.ts";
import {ClientPluginModule} from "@supergrowthai/types/client";

const logger = new Logger('PluginSystem', LogLevel.INFO);

interface PluginContextType {
    status: 'idle' | 'initializing' | 'ready' | 'error';
    plugins: Plugin[];
    loadedPlugins: Map<string, ClientPluginModule>;
    getHookFunctions: (hookName: string) => { pluginId: string, hookFn: UIHookFn, manifestId: string }[];
    callHook: <T, R>(pluginId: string, hookName: string, payload: T) => Promise<R>;
    callRPC: <T, R>(pluginId: string, hookName: string, payload: T) => Promise<R>;
    reloadPlugins: () => Promise<void>;
    hardReloadPlugins: () => Promise<void>;
}

interface HookIndex {
    exact: Map<string, Array<{ pluginId: string, hookFn: UIHookFn }>>;
    patterns: Map<string, Array<{ pattern: string, pluginId: string, hookFn: UIHookFn }>>;
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export const PluginProvider: FunctionComponent = ({children}) => {
    const [status, setStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
    const {user, apis} = useUser();

    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [loadedPlugins, setLoadedPlugins] = useState<Map<string, ClientPluginModule>>(new Map());
    const [hookIndex, setHookIndex] = useState<HookIndex>({exact: new Map(), patterns: new Map()});

    const loadPluginModule = useCallback(async (plugin: Plugin): Promise<[string, ClientPluginModule] | null> => {
        logger.time(`Load plugin ${plugin.name}`);
        if (!plugin.client)
            throw new Error("No client side found for plugin");

        try {
            const url = plugin.client.url;
            let code: string;

            // Skip caching for devMode plugins
            if (plugin.devMode) {
                logger.debug(`DevMode enabled for ${plugin.name}, fetching fresh copy`);
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
                code = await response.text();
            } else {
                const cachedCode = await pluginCache.get(url);
                if (!cachedCode) {
                    logger.debug(`Fetching plugin from ${url}`);
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
                    code = await response.text();
                    await pluginCache.set(url, code);
                    logger.debug(`Fetched and cached plugin ${plugin.name}`);
                } else {
                    code = cachedCode;
                    logger.debug(`Loaded plugin ${plugin.name} from cache`);
                }
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
            const pluginsRes = await apis.getPlugins();

            if (pluginsRes.code !== 0) throw new Error('Failed to fetch plugins.');

            const pluginsToLoad = pluginsRes.payload || [];
            setPlugins(pluginsToLoad);
            logger.debug(`Found ${pluginsToLoad.length} plugins to load.`);

            const results = await Promise.all(pluginsToLoad.map(p => loadPluginModule(p).catch(console.error.bind(null, "Failed to load plugin:"))));

            const newPlugins = new Map<string, ClientPluginModule>();
            results.forEach(result => {
                if (result) newPlugins.set(result[0], result[1]);
            });

            setLoadedPlugins(newPlugins);

            // Build hook index for O(1) lookups
            const index: HookIndex = {exact: new Map(), patterns: new Map()};
            newPlugins.forEach((plugin, pluginId) => {
                if (!plugin.hooks) return;

                Object.entries(plugin.hooks).forEach(([hookName, fn]) => {
                    if (typeof fn !== 'function') return;

                    // Check if this is a pattern-based hook
                    if (hookName.includes('*') || hookName.includes(':')) {
                        if (!index.patterns.has(hookName)) {
                            index.patterns.set(hookName, []);
                        }
                        index.patterns.get(hookName)!.push({
                            pattern: hookName,
                            pluginId,
                            hookFn: fn as UIHookFn
                        });
                    } else {
                        // Exact match hook
                        if (!index.exact.has(hookName)) {
                            index.exact.set(hookName, []);
                        }
                        index.exact.get(hookName)!.push({
                            pluginId,
                            hookFn: fn as UIHookFn
                        });
                    }
                });
            });

            setHookIndex(index);
            logger.info(`Hook index built: ${index.exact.size} exact hooks, ${index.patterns.size} pattern hooks`);

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

    const getHookFunctions = useCallback((hookName: string): {
        pluginId: string,
        hookFn: UIHookFn,
        manifestId: string
    }[] => {
        logger.debug(`getHookFunctions called for hook: "${hookName}"`);

        const functions: { pluginId: string, hookFn: UIHookFn, manifestId: string }[] = [];
        const seenPlugins = new Set<string>(); // Avoid duplicate plugins

        // O(1) exact match lookup
        if (hookIndex.exact.has(hookName)) {
            const exactMatches = hookIndex.exact.get(hookName)!;
            logger.debug(`Found ${exactMatches.length} exact matches for "${hookName}"`);
            exactMatches.forEach(match => {
                if (!seenPlugins.has(match.pluginId)) {
                    // Find the plugin to get its manifest ID
                    const plugin = plugins.find(p => p._id === match.pluginId);
                    if (!plugin) {
                        throw new Error(`Plugin with ID ${match.pluginId} not found in plugins list`);
                    }
                    functions.push({...match, manifestId: plugin.id});
                    seenPlugins.add(match.pluginId);
                }
            });
        }

        // Check patterns (much smaller set than all hooks)
        for (const [pattern, hooks] of hookIndex.patterns) {
            // Check if this is a zone pattern
            if (hookName.includes(':') && pattern.includes(':')) {
                const [hookZone, hookPosition] = hookName.split(':');
                const [patternZone, patternPosition] = pattern.split(':');

                if ((patternZone === '*' || patternZone === hookZone) &&
                    (patternPosition === '*' || patternPosition === hookPosition)) {
                    hooks.forEach(hook => {
                        if (!seenPlugins.has(hook.pluginId)) {
                            logger.debug(`Hook "${hookName}" matches zone pattern "${pattern}"`);
                            // Find the plugin to get its manifest ID
                            const plugin = plugins.find(p => p._id === hook.pluginId);
                            if (!plugin) {
                                throw new Error(`Plugin with ID ${hook.pluginId} not found in plugins list`);
                            }
                            functions.push({pluginId: hook.pluginId, hookFn: hook.hookFn, manifestId: plugin.id});
                            seenPlugins.add(hook.pluginId);
                        }
                    });
                }
            } else if (matchesHookPattern(hookName, pattern)) {
                hooks.forEach(hook => {
                    if (!seenPlugins.has(hook.pluginId)) {
                        logger.debug(`Hook "${hookName}" matches pattern "${pattern}"`);
                        // Find the plugin to get its manifest ID
                        const plugin = plugins.find(p => p._id === hook.pluginId);
                        if (!plugin) {
                            throw new Error(`Plugin with ID ${hook.pluginId} not found in plugins list`);
                        }
                        functions.push({pluginId: hook.pluginId, hookFn: hook.hookFn, manifestId: plugin.id});
                        seenPlugins.add(hook.pluginId);
                    }
                });
            }
        }

        logger.debug(`Returning ${functions.length} hook implementations for "${hookName}"`);
        return functions;
    }, [hookIndex, plugins]);

    const callHook = useCallback(async (pluginId: string, hookName: string, payload: any): Promise<any> => {
        return apis.callPluginHook(pluginId, hookName, payload);
    }, [apis]);

    const callRPC = useCallback(async (pluginId: string, hookName: string, payload: any): Promise<any> => {
        return apis.callPluginRPC(pluginId, hookName, payload);
    }, [apis]);

    const value = useMemo(() => ({
        status,
        plugins,
        loadedPlugins,
        getHookFunctions,
        callHook,
        callRPC,
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

