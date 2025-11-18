import {Logger} from "@supergrowthai/utils";

const logger = new Logger('local-plugin-overrides');

interface PluginOverride {
    serverUrl?: string;
    clientUrl?: string;
}

/**
 * Simple plugin override parser that creates maps from environment variables
 * Format: LOCAL_PLUGIN_OVERRIDE_<pluginId>=<serverUrl>[,<clientUrl>]
 * Examples:
 * LOCAL_PLUGIN_OVERRIDE_my-plugin=http://localhost:3001/plugin.js
 * LOCAL_PLUGIN_OVERRIDE_my-plugin=http://localhost:3001/server.js,http://localhost:3002/client.js
 */
class PluginOverrideManager {
    private overrides: Map<string, PluginOverride> = new Map();

    constructor() {

        for (const [key, value] of Object.entries(process.env)) {
            if (!key.startsWith('LOCAL_PLUGIN_OVERRIDE_') || !value) {
                continue;
            }

            const pluginId = key.replace('LOCAL_PLUGIN_OVERRIDE_', '');
            const urls = value.split(',').map(url => url.trim());

            const override: PluginOverride = {
                serverUrl: urls[0] || undefined,
                clientUrl: urls[1] || undefined
            };

            this.overrides.set(pluginId, override);
            logger.info(`Plugin override: ${pluginId} -> server:${override.serverUrl || 'none'}, client:${override.clientUrl || 'none'}`);
        }

    }

    /**
     * Patch hook mappings to return a new copy
     * Returns a new copy so changes can be applied in the next call
     * Note: Hook mappings don't need filtering since plugins are patched directly
     */
    patchHooks<T>(mappings: T[]): T[] {
        return mappings.map(mapping => ({...mapping}));
    }

    /**
     * Patch plugins array to apply URL overrides directly
     * Returns a new copy so changes can be applied in the next call
     */
    patchPlugins<T extends {
        id: string;
        server?: { url: string };
        client?: { url: string };
        devMode?: boolean
    }>(plugins: T[]): T[] {
        if (this.overrides.size === 0) return [...plugins];

        return plugins.map(plugin => {
            const override = this.overrides.get(plugin.id);
            if (!override || (!override.serverUrl && !override.clientUrl)) {
                return {...plugin}; // Return copy of plugin
            }

            logger.info(`Patching plugin ${plugin.id} with overrides - server:${override.serverUrl || 'none'}, client:${override.clientUrl || 'none'}`);

            const patchedPlugin = {...plugin};

            // Apply server URL override if available
            if (override.serverUrl) {
                patchedPlugin.server = plugin.server
                    ? {...plugin.server, url: override.serverUrl}
                    : {url: override.serverUrl};
            }

            // Apply client URL override if available
            if (override.clientUrl) {
                patchedPlugin.client = {url: override.clientUrl};
            }

            // Mark as devMode when any override is applied
            patchedPlugin.devMode = true;

            return patchedPlugin;
        });
    }
}


export const pluginOverrideManager = new PluginOverrideManager();