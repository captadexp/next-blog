import {Fragment, FunctionComponent, h} from "preact";
import {usePlugins} from "../../../context/PluginContext.tsx";
import {useMemo, useState} from "preact/hooks";
import {useUser} from "../../../context/UserContext.tsx";
import {PluginSDK, UITree} from "./types.ts";
import toast from 'react-hot-toast';


/**
 * A single, stateful host for one plugin's UI. It manages the refresh
 * cycle and renders the UI Tree provided by the plugin.
 */
function PluginHost({pluginId, hookFn, context, callHook}: {
    pluginId: string,
    hookFn: (sdk: PluginSDK, prev: UITree, context?: Record<string, any>) => UITree,
    context?: Record<string, any>,
    callHook<T, R>(id: string, payload: T): Promise<R>
}, previous: UITree) {
    // This host's state is just a number to trigger re-renders when a plugin calls refresh().
    const [refreshKey, setRefreshKey] = useState(0);
    const {apis, user, config} = useUser();
    console.debug(`[PluginSystem] Creating PluginHost for plugin "${pluginId}" with refreshKey: ${refreshKey}`);

    // Craft the secure, sandboxed SDK for the plugin.
    const sdk: PluginSDK = useMemo(() => ({
        apis: apis,
        user,
        notify(message, status) {
            (status ? (toast[status] || toast) : toast)(message);
        },
        settings: config || {},
        refresh: () => {
            console.debug(`[PluginSystem] Refresh requested by plugin "${pluginId}"`);
            setRefreshKey(Date.now())
        },
        utils: {
            debounce: (func: any, delay: number) => {
                let timeout: any
                return (...args: any[]) => {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => func(...args), delay);
                };
            }
        },
        callHook
    }), [apis, user, config, context, pluginId, callHook]);

    // This recursive function securely turns the simple array format into Preact VNodes.
    const renderTree = (tree: UITree): h.JSX.Element | string | null => {
        if (!tree) return null;
        if (typeof tree === 'string') return tree;
        if (!Array.isArray(tree) || typeof tree[0] !== 'string') {
            console.error(`[PluginSystem] Invalid UI Tree format from plugin "${pluginId}":`, tree);
            return null;
        }

        const [tag, props, ...children] = tree;
        const finalProps: Record<string, any> = {};

        // A whitelist of allowed tags for security. Added tags needed for the SEO plugin.
        const allowedTags = [
            'div', 'p', 'button', 'span', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'li',
            'label', 'input', 'textarea'
        ];
        if (!allowedTags.includes(tag.toLowerCase())) {
            console.warn(`[PluginSystem] Plugin "${pluginId}" tried to render a disallowed tag: <${tag}>. Rendering an empty span instead.`);
            return <span/>;
        }

        if (props) {
            // A whitelist of allowed props
            const allowedProps = ['class', 'style', 'id', 'type', 'value', 'placeholder', 'for', 'href', 'target', 'src', 'alt'];

            for (const key in props) {
                if (key.startsWith('on') && typeof props[key] === 'function') {
                    finalProps[key] = (e: Event) => {
                        e.preventDefault();
                        console.debug(`[PluginSystem] Event "${key}" triggered by plugin "${pluginId}"`);
                        //fixme maybe extract the value and pass it forward
                        props[key](sdk, context, JSON.parse(JSON.stringify((e.target as any)?.value || null)));
                    }
                } else if (allowedProps.includes(key.toLowerCase())) {
                    finalProps[key] = props[key];
                }
            }
        }

        return h(tag as any, finalProps, ...children.map(renderTree));
    }

    // 1. Execute the plugin's hook function, passing the SDK and context.
    console.debug(`[PluginSystem] Executing hook for plugin "${pluginId}"`);
    console.time(`[PluginSystem] Execute hook for plugin "${pluginId}"`);
    const uiTree = hookFn(sdk, previous, context);
    console.timeEnd(`[PluginSystem] Execute hook for plugin "${pluginId}"`);
    console.debug(`[PluginSystem] UI tree received from plugin "${pluginId}":`, uiTree);


    // 2. Render the UI description provided by the plugin.
    console.debug(`[PluginSystem] Rendering UI for plugin "${pluginId}"`);
    console.time(`[PluginSystem] Render UI for plugin "${pluginId}"`);
    const renderedElement = renderTree(uiTree);
    console.timeEnd(`[PluginSystem] Render UI for plugin "${pluginId}"`);
    return renderedElement;
}

/**
 * The public-facing component. Place this in your application where you want
 * plugins to be able to add UI.
 */
export const PluginSlot: FunctionComponent<{ hookName: string, context?: Record<string, any> }> = (props) => {
    const {hookName, context} = props;
    const {getHookFunctions, status, callHook} = usePlugins();

    if (status !== 'ready') {
        return null; // Or a loading indicator
    }

    const hookFunctions = getHookFunctions(hookName);

    if (!hookFunctions.length) {
        return null;
    }

    return (
        <Fragment>
            {hookFunctions.map(({pluginId, hookFn},) => PluginHost({
                pluginId,
                hookFn,
                callHook,
                context
            }, ""))}
        </Fragment>
    );
};