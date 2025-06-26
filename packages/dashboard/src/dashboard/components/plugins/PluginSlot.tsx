import {Fragment, FunctionComponent, h} from "preact";
import {usePlugins} from "../../../context/PluginContext.tsx";
import {useState} from "preact/hooks";
import {useUser} from "../../../context/UserContext.tsx";
import {useMemo} from "react";
import {PluginSDK, UITree} from "./types.ts";

/**
 * A single, stateful host for one plugin's UI. It manages the refresh
 * cycle and renders the UI Tree provided by the plugin.
 */
const PluginHost: FunctionComponent<{ pluginId: string; hookFn: (sdk: PluginSDK) => UITree }> = ({
                                                                                                     pluginId,
                                                                                                     hookFn
                                                                                                 }) => {
    // This host's state is just a number to trigger re-renders when a plugin calls refresh().
    const [refreshKey, setRefreshKey] = useState(0);
    const {apis, user, config} = useUser();

    // Craft the secure, sandboxed SDK for the plugin.
    const sdk: PluginSDK = useMemo(() => ({
        api: apis,
        user,
        notify(...args) {
            console.log("notify", ...args)
        },
        settings: config || {},
        refresh: () => setRefreshKey(Date.now()),
    }), [apis, user, config]);

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

        // A whitelist of allowed tags for security.
        const allowedTags = ['div', 'p', 'button', 'span', 'strong', 'em', 'h1', 'h2', 'h3', 'a', 'img', 'ul', 'li'];
        if (!allowedTags.includes(tag)) {
            console.warn(`[PluginSystem] Plugin "${pluginId}" tried to render a disallowed tag: <${tag}>. Rendering an empty span instead.`);
            return <span/>;
        }

        if (props) {
            for (const key in props) {
                if (key.startsWith('on') && typeof props[key] === 'function') {
                    finalProps[key] = (e: Event) => {
                        e.preventDefault();
                        props[key](sdk);
                    }
                } else {
                    finalProps[key] = props[key];
                }
            }
        }

        return h(tag as any, finalProps, ...children.map(renderTree));
    }

    // 1. Execute the plugin's hook function, passing only the SDK.
    const uiTree = hookFn(sdk);

    // 2. Render the UI description provided by the plugin.
    return renderTree(uiTree);
};

/**
 * The public-facing component. Place this in your application where you want
 * plugins to be able to add UI.
 */
export const PluginSlot: FunctionComponent<{ hookName: string }> = ({hookName}) => {
    const {getHookFunctions, status} = usePlugins();

    if (status !== 'ready') {
        return null; // Or a loading indicator
    }

    const hookFunctions = getHookFunctions(hookName);

    if (!hookFunctions.length) {
        return null;
    }

    return (
        <Fragment>
            {hookFunctions.map(({pluginId, hookFn}) => (
                <PluginHost key={pluginId} pluginId={pluginId} hookFn={hookFn}/>
            ))}
        </Fragment>
    );
};