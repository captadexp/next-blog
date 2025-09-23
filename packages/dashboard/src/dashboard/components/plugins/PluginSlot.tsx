import {Fragment, FunctionComponent, h} from "preact";
import {usePlugins} from "../../../context/PluginContext.tsx";
import {useMemo, useState} from "preact/hooks";
import {useUser} from "../../../context/UserContext.tsx";
import {PluginSDK, UIHookFn} from "./types.ts";
import Logger, {LogLevel} from "../../../utils/Logger.ts";
import {createRenderer} from "@supergrowthai/jsx-runtime/preact";
import {createClientSDK} from "../../../sdk/sdk-factory.client";

// Create the renderer once with Preact's h and Fragment
const render = createRenderer(h, Fragment);

const logger = new Logger('PluginSystem', LogLevel.INFO);


/**
 * A single, stateful host for one plugin's UI. It manages the refresh
 * cycle and renders the UI Tree provided by the plugin.
 */
function PluginHost({pluginId, hookFn, context, callHook}: {
    pluginId: string,
    hookFn: UIHookFn,
    context?: Record<string, any>,
    callHook<T, R>(id: string, payload: T): Promise<R>
}) {
    // This host's state is just a number to trigger re-renders when a plugin calls refresh().
    const [refreshKey, setRefreshKey] = useState(0);
    const {apis, user} = useUser();
    logger.debug(`Creating PluginHost for plugin "${pluginId}" with refreshKey: ${refreshKey}`);

    // Create plugin-specific SDK using the factory
    const sdk: PluginSDK = useMemo(() => {
        const {utils} = window.PluginRuntime;

        // Use the SDK factory to create a properly fingerprinted SDK
        return createClientSDK(
            pluginId,
            apis,
            user,
            utils,
            callHook,
            () => {
                logger.debug(`Refresh requested by plugin "${pluginId}"`);
                setRefreshKey(Date.now());
            }
        ) as PluginSDK;
    }, [apis, user, pluginId, callHook]);


    // Execute the plugin's hook function
    logger.debug(`Executing hook for plugin "${pluginId}"`);
    const uiTree = hookFn(sdk, null, context);

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
    const {hookName: providedHookName, page, position, entity, section, context} = props;
    const {getHookFunctions, status, callHook} = usePlugins();

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

    const hookFunctions = getHookFunctions(hookName);

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
            {hookFunctions.map(({pluginId, hookFn}) => PluginHost({
                pluginId,
                hookFn,
                callHook,
                context: enhancedContext
            }))}
        </Fragment>
    );
};
