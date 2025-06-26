import ApiClient from "../../../api/client.ts";
import {User} from "../../../types/api.ts";

/**
 * The SDK provided to every plugin function, providing sandboxed access to app functionality.
 */
export interface PluginSDK {
    api: ApiClient;
    user: User | null;
    settings: any;
    notify: (message: string, status?: 'success' | 'error' | 'info') => void;
    /** Triggers the host component to re-render the plugin's UI. */
    refresh: () => void;
}

/**
 * The signature for a plugin's UI hook function.
 * It's a stateless function that receives the SDK and returns a description of the UI.
 */
export type UIHookFn = (sdk: PluginSDK) => any;

/**
 * A description of a UI element using a simple array format.
 * e.g., ['div', { class: 'foo' }, 'Hello']
 */
export type UITree = [string, Record<string, any>?, ...(UITree | string)[]] | string;
