/**
 * Helper for smart metadata scoping and cross-plugin validation
 */

export interface MetadataScopingOptions {
    /** The current plugin ID performing the operation */
    pluginId: string;

    /**
     * Allow this plugin to update metadata owned by other plugins
     * Function receives (key, targetPluginId) and returns true if allowed
     */
    allowCrossPluginUpdate?: (key: string, targetPluginId: string) => boolean;
}

/**
 * Extract plugin ID from a scoped metadata key
 * @param key - The metadata key (e.g., 'plugin-id:keyname' or 'unscoped')
 * @returns Plugin ID if scoped, null if unscoped
 */
export function extractPluginIdFromKey(key: string): string | null {
    const colonIndex = key.indexOf(':');
    if (colonIndex === -1) return null; // Unscoped key
    return key.substring(0, colonIndex);
}

/**
 * Apply smart scoping logic to metadata keys with cross-plugin validation
 * @param metadata - The metadata object to scope
 * @param options - Scoping options including plugin ID and validation
 * @returns Scoped metadata object
 * @throws Error if cross-plugin update is attempted without permission
 */
export function applyMetadataScoping(
    metadata: Record<string, any>,
    options: MetadataScopingOptions
): Record<string, any> {
    const {pluginId, allowCrossPluginUpdate} = options;
    const scopedMetadata: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
        // Check if key is already scoped
        const targetPluginId = extractPluginIdFromKey(key);

        if (targetPluginId) {
            // Key is already scoped
            if (targetPluginId === pluginId) {
                // Same plugin - allow
                scopedMetadata[key] = value;
            } else {
                // Cross-plugin update attempt
                if (allowCrossPluginUpdate && allowCrossPluginUpdate(key, targetPluginId)) {
                    // Explicitly allowed by validation function
                    scopedMetadata[key] = value;
                } else {
                    throw new Error(
                        `Plugin '${pluginId}' is not allowed to update metadata key '${key}' ` +
                        `owned by plugin '${targetPluginId}'. Use allowCrossPluginUpdate option if intentional.`
                    );
                }
            }
        } else {
            // Unscoped key - add plugin prefix
            scopedMetadata[`${pluginId}:${key}`] = value;
        }
    }

    return scopedMetadata;
}