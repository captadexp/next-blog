import type {ClientSDK, JSXElement} from '@supergrowthai/types';
import type ApiClient from "../../../api/client.ts";

// For backward compatibility, create a type alias
export type PluginSDK = ClientSDK & {
    apis: ApiClient; // Use the specific ApiClient implementation
};

// Re-export JSXElement from types
export type {JSXElement} from '@supergrowthai/types';

/**
 * The signature for a plugin's UI hook function.
 * It's a stateless function that receives the SDK and returns a JSX element.
 * The prev parameter is for compatibility with plugins that track previous state.
 */
export type UIHookFn = (sdk: PluginSDK, prev?: any, context?: Record<string, any>) => JSXElement | null;
