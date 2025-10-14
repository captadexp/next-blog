import {Fragment, FunctionComponent, h} from "preact";
import {usePlugins} from "../../../context/PluginContext.tsx";
import {useCallback, useContext, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState} from "preact/hooks";
import {useUser} from "../../../context/UserContext.tsx";
import Logger, {LogLevel} from "../../../utils/Logger.ts";
import {createRenderer} from "@supergrowthai/jsx-runtime/preact";
import {createClientSDK} from "../../../sdk/sdk-factory.client";
import {UIHookFn} from "@supergrowthai/next-blog-types";
import {ClientSDK} from "@supergrowthai/next-blog-types/client";
import {memo} from "preact/compat";

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

const ProxyComponent = memo(({refreshKey, hookFn, context, pluginId, sdk}: {
    refreshKey: number,
    hookFn: any,
    pluginId: string,
    sdk: ClientSDK,
    context?: Record<string, any>
}) => {

    let renderedContent: any = null;
    try {
        renderedContent = hookFn(sdk, null, context);
    } catch (e: any) {
        logger.error(`Hook execution failed for plugin "${pluginId}":`, e?.message?.toString());
    }

    try {
        logger.debug(`Rendering plugin "${pluginId}"`);
        return render(renderedContent, {sdk, context, pluginId});
    } catch (e: any) {
        logger.error(`Rendering plugin "${pluginId}" failed:`, e?.message?.toString());
        return null;
    }
});

/**
 * A single, stateful host for one plugin's UI. It manages the refresh
 * cycle and renders the UI Tree provided by the plugin.
 */
const PluginHost = memo(({hookName, pluginId, hookFn, context, callHook, callRPC}: {
    hookName: string,
    pluginId: string,
    hookFn: UIHookFn,
    context?: Record<string, any>,
    callHook<T, R>(id: string, payload: T): Promise<R>
    callRPC<T, R>(id: string, payload: T): Promise<R>
}) => {
    const [refreshKey, setRefreshKey] = useState(0);
    const {apis, user} = useUser();
    logger.debug(`Creating PluginHost for plugin "${pluginId}" with refreshKey: ${refreshKey}`);

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

    return (
        <ProxyComponent
            refreshKey={refreshKey}
            context={context}
            hookFn={hookFn}
            pluginId={pluginId}
            sdk={sdk}
        />
    );
}, (prevProps, nextProps) => {

    return (
        prevProps.hookName === nextProps.hookName &&
        prevProps.pluginId === nextProps.pluginId &&
        prevProps.hookFn === nextProps.hookFn &&
        prevProps.callHook === nextProps.callHook &&
        prevProps.callRPC === nextProps.callRPC
    );
});

interface PluginSlotProps {
    hookName: string;
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
    const {hookName: hookName, context, pluginFilter} = props;
    const {getHookFunctions, status, callHook, callRPC} = usePlugins();

    if (status !== 'ready') {
        return null;
    }

    let hookFunctions = getHookFunctions(hookName);

    // Filter by plugin if specified
    if (pluginFilter) {
        hookFunctions = hookFunctions.filter(({pluginId}) => pluginId === pluginFilter);
    }

    if (!hookFunctions.length) {
        return null;
    }

    return (
        <Fragment>
            {hookFunctions.map(({pluginId, hookFn, manifestId}) => (
                <div key={pluginId} className={`plugin-${manifestId}`}>
                    <PluginHost {...{
                        pluginId,
                        hookFn,
                        callHook: (name, payload) => callHook(pluginId, name, payload),
                        callRPC: (name, payload) => callRPC(pluginId, name, payload),
                        hookName
                    }} context={context}/>
                </div>
            ))}
        </Fragment>
    );
};
