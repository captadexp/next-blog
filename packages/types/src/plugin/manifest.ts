/**
 * Plugin manifest types - metadata and configuration
 */

/**
 * Plugin manifest - defines plugin metadata and configuration
 * This is what's exported from the plugin's index.ts
 */
export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    author?: string;
    slots?: string[];
    permissions?: string[];
    config?: Record<string, {
        type: 'string' | 'number' | 'boolean' | 'object';
        default?: any;
        description?: string;
        required?: boolean;
    }>;
    
    // URLs for plugin resources (injected at build time in dev mode)
    url?: string;  // URL to the plugin manifest file
    client?: {
        type: 'url';
        url: string;
    };  // Client-side bundle location
    server?: {
        type: 'url';
        url: string;
    };  // Server-side bundle location
}
