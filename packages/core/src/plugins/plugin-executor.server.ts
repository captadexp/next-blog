import {DatabaseAdapter, Plugin, PluginHookMapping, PluginModule} from '../types.js';

/**
 * Server-side plugin executor
 * Handles loading and executing plugins on the server
 */
class PluginExecutor {
    private plugins: Map<string, PluginModule> = new Map();
    private hookMappings: Map<string, PluginHookMapping[]> = new Map();
    private db: DatabaseAdapter | null = null;

    /**
     * Initialize the plugin executor with a database adapter
     * @param db Database adapter
     */
    async initialize(db: DatabaseAdapter) {
        this.db = db;
        await this.loadPlugins();
    }

    /**
     * Execute plugins for a specific hook
     * @param hookName Name of the hook to execute
     * @param context Context object to pass to the plugin
     * @returns Modified context object
     */
    async executeHook(hookName: string, context: any = {}): Promise<any> {
        if (!this.hookMappings.has(hookName)) {
            return context;
        }

        const mappings = this.hookMappings.get(hookName) || [];

        for (const mapping of mappings) {
            try {
                const plugin = this.plugins.get(mapping.pluginId);

                if (!plugin) {
                    console.warn(`Plugin ${mapping.pluginId} not found for hook ${hookName}`);
                    continue;
                }

                // Execute the plugin's hook function if it exists
                if (plugin.hooks && typeof plugin.hooks[hookName] === 'function') {
                    context = await plugin.hooks[hookName](context);
                }
            } catch (error) {
                console.error(`Error executing plugin for hook ${hookName}:`, error);
            }
        }

        return context;
    }

    /**
     * Register a plugin hook mapping
     * @param pluginId ID of the plugin
     * @param hookName Name of the hook
     * @param priority Priority of the hook (lower numbers execute first)
     */
    async registerHook(pluginId: string, hookName: string, priority: number = 10) {
        if (!this.db) return;

        try {
            // Check if plugin exists
            const plugin = await this.db.plugins.findById(pluginId);
            if (!plugin) {
                throw new Error(`Plugin ${pluginId} not found`);
            }

            // Create hook mapping
            const hookMapping = await this.db.pluginHookMappings.create({
                pluginId,
                hookName,
                priority
            });

            // Update in-memory hook mappings
            if (!this.hookMappings.has(hookName)) {
                this.hookMappings.set(hookName, []);
            }

            const mappings = this.hookMappings.get(hookName) || [];
            mappings.push(hookMapping);

            // Re-sort by priority
            this.hookMappings.set(
                hookName,
                mappings.sort((a, b) => a.priority - b.priority)
            );

            console.log(`Registered hook ${hookName} for plugin ${pluginId} with priority ${priority}`);
        } catch (error) {
            console.error(`Error registering hook ${hookName} for plugin ${pluginId}:`, error);
        }
    }

    /**
     * Post-install function for plugins
     * @param pluginId ID of the plugin
     */
    async postInstall(pluginId: string) {
        if (!this.db) {
            console.log("db undefined")
            return;
        }

        try {
            // Load the plugin if not already loaded
            const plugin = await this.db.plugins.findById(pluginId);
            if (!plugin) {
                throw new Error(`Plugin ${pluginId} not found`);
            }

            if (!this.plugins.has(pluginId)) {
                await this.loadPlugin(plugin);
            }

            const pluginModule = this.plugins.get(pluginId);

            // Call the plugin's postInstall function if it exists
            if (pluginModule && typeof pluginModule.postInstall === 'function') {
                // Pass the database adapter and pluginId to the postInstall function
                const success = await pluginModule.postInstall(this.db, pluginId);

                if (success) {
                    console.log(`Post-install completed successfully for plugin ${plugin.name}`);
                } else {
                    console.warn(`Post-install completed with errors for plugin ${plugin.name}`);
                }
            } else {
                console.log(pluginModule)
                console.log(`No postInstall function found for plugin ${plugin.name}`);
            }
        } catch (error) {
            console.error(`Error in post-install for plugin ${pluginId}:`, error);
        }
    }

    /**
     * Called when a plugin is deleted
     * Executes the plugin's onDelete callback if it exists
     * @param pluginId ID of the plugin
     */
    async onDelete(pluginId: string) {
        if (!this.db) return;

        try {
            // Get the plugin from the database
            const plugin = await this.db.plugins.findById(pluginId);
            if (!plugin) {
                throw new Error(`Plugin ${pluginId} not found`);
            }

            // Get the plugin module
            let pluginModule = this.plugins.get(pluginId);
            if (!pluginModule) {
                // If the plugin module isn't loaded, try to load it
                await this.loadPlugin(plugin);
                pluginModule = this.plugins.get(pluginId);
            }

            // Call the plugin's onDelete function if it exists
            if (pluginModule && typeof pluginModule.onDelete === 'function') {
                // Pass the database adapter and pluginId to the onDelete function
                const success = await pluginModule.onDelete(this.db, pluginId);

                if (success) {
                    console.log(`Delete cleanup completed successfully for plugin ${plugin.name}`);
                } else {
                    console.warn(`Delete cleanup completed with errors for plugin ${plugin.name}`);
                }
            } else {
                console.log(`No onDelete function found for plugin ${plugin.name}`);
            }

            // Remove the plugin from the in-memory maps
            this.plugins.delete(pluginId);

            // Remove all hook mappings for this plugin
            for (const [hookName, mappings] of this.hookMappings.entries()) {
                const filteredMappings = mappings.filter(mapping => mapping.pluginId !== pluginId);
                if (filteredMappings.length !== mappings.length) {
                    this.hookMappings.set(hookName, filteredMappings);
                }
            }

            console.log(`Plugin ${plugin.name} removed from memory`);
        } catch (error) {
            console.error(`Error in onDelete for plugin ${pluginId}:`, error);
        }
    }

    /**
     * Load all plugins from the database
     */
    private async loadPlugins() {
        if (!this.db) return;

        try {
            // Load all plugins
            const plugins = await this.db.plugins.find({});

            // Load all hook mappings
            const hookMappings = await this.db.pluginHookMappings.find({});

            // Group hook mappings by hook name
            this.hookMappings.clear();
            for (const mapping of hookMappings) {
                if (!this.hookMappings.has(mapping.hookName)) {
                    this.hookMappings.set(mapping.hookName, []);
                }
                this.hookMappings.get(mapping.hookName)?.push(mapping);
            }

            // Sort hook mappings by priority (lower numbers execute first)
            for (const [hookName, mappings] of this.hookMappings.entries()) {
                this.hookMappings.set(
                    hookName,
                    mappings.sort((a, b) => a.priority - b.priority)
                );
            }

            // Load each plugin
            for (const plugin of plugins) {
                await this.loadPlugin(plugin);
            }

            console.log(`Loaded ${plugins.length} plugins with ${hookMappings.length} hook mappings`);
        } catch (error) {
            console.error('Error loading plugins:', error);
        }
    }

    /**
     * Load a single plugin
     * @param plugin Plugin to load
     */
    private async loadPlugin(plugin: Plugin) {
        try {
            if (plugin.type === 'lite') {
                // For lite plugins, load from a local file
                try {
                    // Dynamic import for the plugin file
                    const pluginModule = await import(plugin.entryPoint);
                    this.plugins.set(plugin._id, pluginModule);
                } catch (error) {
                    console.error(`Error loading lite plugin ${plugin.name}:`, error);
                }
            } else if (plugin.type === 'external') {
                // For external plugins, we would fetch from URL
                // This is a placeholder for external plugin loading
                console.log(`External plugin ${plugin.name} would be loaded from ${plugin.entryPoint}`);
            } else if (plugin.type === "browser") {

                //todo cache this locally
                const response = await fetch(plugin.entryPoint);
                if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
                const code = await response.text();

                const blob = new Blob([`return ${code}`], {type: 'text/javascript'});
                const objectUrl = URL.createObjectURL(blob);
                const module = new Function(await (await fetch(objectUrl)).text())();
                URL.revokeObjectURL(objectUrl);
                if (!module || typeof module !== 'object') throw new Error(`Plugin ${plugin.name} did not return a valid module object.`);

                this.plugins.set(plugin._id, module);
            }
            // Browser plugins are loaded on the client side
        } catch (error) {
            console.error(`Error loading plugin ${plugin.name}:`, error);
        }
    }
}

const pluginExecutor = new PluginExecutor();
export default pluginExecutor;
