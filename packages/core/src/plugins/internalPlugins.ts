/**
 * Internal plugin definitions
 * Future system-update-manager plugin will handle version updates
 */
export const INTERNAL_PLUGINS = {
    system: "internal://internal-plugins/system/plugin.js"
    // Add more internal plugins here as they are created
} as const;

/**
 * Check if a plugin is an internal plugin
 * @param pluginId The plugin ID
 * @returns True if the plugin is an internal plugin
 */
export function isInternalPlugin(pluginId: string): boolean {
    return pluginId in INTERNAL_PLUGINS;
}