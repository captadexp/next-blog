import {Fragment, FunctionComponent, h} from "preact";
import {usePlugins} from "../../../context/PluginContext.tsx";
import {useCallback, useContext, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState} from "preact/hooks";
import {useUser} from "../../../context/UserContext.tsx";
import Logger, {LogLevel} from "../../../utils/Logger.ts";
import {createRenderer} from "@supergrowthai/jsx-runtime/preact";
import {createClientSDK} from "../../../sdk/sdk-factory.client";
import {UIHookFn} from "@supergrowthai/types";
import {ClientSDK} from "@supergrowthai/types/client";

// Create the renderer once with Preact's h, Fragment, and hooks
const hooks = {
    useState,
    useEffect,
    useMemo,
    useCallback,
    useRef,
    useContext,
    useReducer,
    useLayoutEffect
};
const render = createRenderer(h, Fragment, hooks);

const logger = new Logger('PluginSystem', LogLevel.INFO);


/**
 * A single, stateful host for one plugin's UI. It manages the refresh
 * cycle and renders the UI Tree provided by the plugin.
 */
function PluginHost({pluginId, hookFn, context, callHook, callRPC}: {
    pluginId: string,
    hookFn: UIHookFn,
    context?: Record<string, any>,
    callHook<T, R>(id: string, payload: T): Promise<R>
    callRPC<T, R>(id: string, payload: T): Promise<R>
}) {
    // This host's state is just a number to trigger re-renders when a plugin calls refresh().
    const [refreshKey, setRefreshKey] = useState(0);
    const {apis, user} = useUser();
    logger.debug(`Creating PluginHost for plugin "${pluginId}" with refreshKey: ${refreshKey}`);

    // Create plugin-specific SDK using the factory
    const sdk: ClientSDK = useMemo(() => {
        const {utils} = window.PluginRuntime;

        // Use the SDK factory to create a properly fingerprinted SDK
        return createClientSDK(
            pluginId,
            apis,
            user,
            utils,
            callHook,
            callRPC,
            () => {
                logger.debug(`Refresh requested by plugin "${pluginId}"`);
                setRefreshKey(Date.now());
            }
        );
    }, [apis, user, pluginId, callHook, callRPC]);


    let uiTree: any = null;
    try {
        logger.debug(`Executing hook for plugin "${pluginId}"`);
        uiTree = hookFn(sdk, null, context);
    } catch (e: any) {
        logger.error(`Executing hook for plugin "${pluginId}" Failed:`, e?.message?.toString());
    }

    if (!uiTree) {
        logger.debug(`Plugin "${pluginId}" returned null`);
        return null;
    }

    // Render using jsx-runtime
    try {
        return render(uiTree, {sdk, context, pluginId});
    } catch (err) {
        logger.error(`Failed to render plugin "${pluginId}":`, err);
        return null;
    }
}

interface PluginSlotProps {
    hookName?: string;
    page?: string;
    position?: string;
    entity?: string;
    section?: string;
    context?: Record<string, any>;
    pluginFilter?: string;
}

/**
 * The public-facing component. Place this in your application where you want
 * plugins to be able to add UI. Supports both static hook names and dynamic patterns.
 *
 * Examples:
 * - <PluginSlot hookName="dashboard-header" />
 * - <PluginSlot page="blogs" position="header" />
 * - <PluginSlot entity="blog" position="sidebar" />
 */
export const PluginSlot: FunctionComponent<PluginSlotProps> = (props) => {
    const {hookName: providedHookName, page, position, entity, section, context, pluginFilter} = props;
    const {getHookFunctions, status, callHook, callRPC} = usePlugins();

    // Generate hook name from pattern if not provided directly
    const hookName = useMemo(() => {
        if (providedHookName) return providedHookName;

        // Build dynamic hook name from parts
        const parts: string[] = [];
        if (page) {
            parts.push('dashboard', page);
        } else if (entity) {
            parts.push('editor', entity);
        }
        if (section) parts.push(section);
        if (position) parts.push(position);

        return parts.join('-');
    }, [providedHookName, page, position, entity, section]);

    if (status !== 'ready') {
        return null; // Or a loading indicator
    }

    let hookFunctions = getHookFunctions(hookName);

    // Filter by plugin if specified
    if (pluginFilter) {
        hookFunctions = hookFunctions.filter(({pluginId}) => pluginId === pluginFilter);
    }

    if (!hookFunctions.length) {
        return null;
    }

    // Enhanced context with hook metadata
    const enhancedContext = {
        ...context,
        hookName,
        page,
        position,
        entity,
        section
    };

    return (
        <Fragment>
            {hookFunctions.map(({pluginId, hookFn, manifestId}) => (
                <div key={pluginId} className={`plugin-${manifestId}`}>
                    {PluginHost({
                        pluginId,
                        hookFn,
                        callHook: (name, payload) => callHook(pluginId, name, payload),
                        callRPC: (name, payload) => callRPC(pluginId, name, payload),
                        context: enhancedContext
                    })}
                </div>
            ))}
        </Fragment>
    );
};
