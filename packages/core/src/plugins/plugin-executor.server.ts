import {DatabaseAdapter, Plugin, PluginHookMapping, PluginModule} from '../types.js';


/**
 * Server-side plugin executor
 * Handles loading and executing server-side plugins.
 */
class PluginExecutor {
    private plugins: Map<string, PluginModule> = new Map();
    private hookMappings: Map<string, PluginHookMapping[]> = new Map();
    private pluginCodeCache: Map<string, string> = new Map(); // Cache for lite plugin code
    private db: DatabaseAdapter | null = null;


    async initialize(db: DatabaseAdapter) {
        this.db = db;
        await this.loadPlugins();
    }

    async executeHook(hookName: string, context: any = {}): Promise<any> {
        if (!this.hookMappings.has(hookName)) {
            return context;
        }

        const mappings = this.hookMappings.get(hookName) || [];
        let currentContext = context;

        for (const mapping of mappings) {
            try {
                const pluginDbEntry = await this.db!.plugins.findById(mapping.pluginId); // Get the Plugin from DB
                if (!pluginDbEntry) {
                    console.warn(`Plugin ${mapping.pluginId} not found in DB for hook ${hookName}`);
                    continue;
                }

                if (pluginDbEntry.type === 'external') {
                    // Handle external plugin via webhook
                    try {
                        const response = await fetch(pluginDbEntry.entryPoint, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({hookName, context: currentContext}), // Pass actual hookName
                        });
                        if (!response.ok) throw new Error(`External plugin webhook failed: ${response.statusText}`);
                        currentContext = await response.json();
                    } catch (error) {
                        console.error(`Error calling external plugin webhook ${pluginDbEntry.name} for hook ${hookName}:`, error);
                        // Continue with currentContext on error
                    }
                } else { // This handles 'lite' plugins
                    const pluginModule = this.plugins.get(mapping.pluginId);
                    if (!pluginModule) {
                        console.warn(`Plugin module ${mapping.pluginId} not loaded for hook ${hookName}`);
                        continue;
                    }

                    if (pluginModule.hooks && typeof pluginModule.hooks[hookName] === 'function') {
                        currentContext = await pluginModule.hooks[hookName](currentContext);
                    }
                }
            } catch (error) {
                console.error(`Error executing plugin for hook ${hookName}:`, error);
            }
        }
        return currentContext;
    }

    async registerHook(pluginId: string, hookName: string, priority: number = 10) {
        if (!this.db) return;

        try {
            const plugin = await this.db.plugins.findById(pluginId);
            if (!plugin) throw new Error(`Plugin ${pluginId} not found`);

            const hookMapping = await this.db.pluginHookMappings.create({
                pluginId,
                hookName,
                priority
            });

            const mappings = this.hookMappings.get(hookName) || [];
            mappings.push(hookMapping);
            this.hookMappings.set(hookName, mappings.sort((a, b) => a.priority - b.priority));

            console.log(`Registered hook ${hookName} for plugin ${pluginId} with priority ${priority}`);
        } catch (error) {
            console.error(`Error registering hook ${hookName} for plugin ${pluginId}:`, error);
        }
    }

    async postInstall(pluginId: string) {
        if (!this.db) return;

        try {
            const plugin = await this.db.plugins.findById(pluginId);
            if (!plugin) throw new Error(`Plugin ${pluginId} not found`);

            if (plugin.type === 'external') {
                console.log(`Skipping server-side post-install for external plugin: ${plugin.name}`);
                return;
            }

            let pluginModule: PluginModule | undefined = this.plugins.get(pluginId);

            if (!pluginModule) {
                // If plugin not already loaded (e.g., new plugin install), load it now.
                await this.loadPlugin(plugin);
                pluginModule = this.plugins.get(pluginId);
            }

            if (!pluginModule) {
                console.error(`Failed to get module for plugin ${pluginId} during post-install.`);
                return;
            }

            // Register hooks for both lite and browser plugins
            if (pluginModule.hooks && typeof pluginModule.hooks === 'object') {
                for (const hookName of Object.keys(pluginModule.hooks)) {
                    await this.registerHook(pluginId, hookName);
                }
            }

            // Only call postInstall for lite plugins (server-side execution)
            if (plugin.type === 'lite' && typeof pluginModule.postInstall === 'function') {
                const success = await pluginModule.postInstall(this.db, pluginId);
                if (success) {
                    console.log(`Post-install setup completed successfully for lite plugin ${plugin.name}`);
                } else {
                    console.warn(`Post-install setup completed with errors for lite plugin ${plugin.name}`);
                }
            }

        } catch (error) {
            console.error(`Error in post-install for plugin ${pluginId}:`, error);
        }
    }

    async onDelete(pluginId: string) {
        if (!this.db) return;

        try {
            const plugin = await this.db.plugins.findById(pluginId);
            if (!plugin) throw new Error(`Plugin ${pluginId} not found`);

            // Server-side executor should not handle external plugins for post-install
            if (plugin.type === 'external') {
                console.log(`Skipping server-side post-install for ${plugin.type} plugin: ${plugin.name}`);
                return;
            }

            let pluginModule = this.plugins.get(pluginId);
            if (!pluginModule) {
                // Plugin might not be loaded if it failed previously.
                // We load it JIT to ensure its onDelete hook can be called.
                await this.loadPlugin(plugin);
                pluginModule = this.plugins.get(pluginId);
            }

            if (pluginModule && typeof pluginModule.onDelete === 'function') {
                await pluginModule.onDelete(this.db, pluginId);
            }

            // Remove hook mappings from the database
            await this.db.pluginHookMappings.delete({pluginId});

            // Clean up memory
            this.plugins.delete(pluginId);
            for (const [hookName, mappings] of this.hookMappings.entries()) {
                const filtered = mappings.filter(m => m.pluginId !== pluginId);
                this.hookMappings.set(hookName, filtered);
            }

            console.log(`Plugin ${plugin.name} uninstalled and removed from server-side memory.`);
        } catch (error) {
            console.error(`Error in onDelete for plugin ${pluginId}:`, error);
        }
    }

    private async loadPlugins() {
        if (!this.db) return;
        try {
            const allPlugins = await this.db.plugins.find({});
            // Load all plugins (lite, browser, external) into memory for hook registration and execution
            for (const plugin of allPlugins) {
                await this.loadPlugin(plugin);
            }
            console.log(`Loaded ${this.plugins.size} server-side plugins.`);
        } catch (error) {
            console.error('Error loading plugins:', error);
        }
    }

    private async loadPlugin(plugin: Plugin) {
        try {
            let code: string;
            if (plugin.type === 'lite' || plugin.type === 'browser') {
                if (this.pluginCodeCache.has(plugin.entryPoint)) {
                    code = this.pluginCodeCache.get(plugin.entryPoint)!;
                } else {
                    const response = await fetch(plugin.entryPoint);
                    if (!response.ok) throw new Error(`Fetch failed for plugin ${plugin.name}: ${response.statusText}`);
                    code = await response.text();
                    this.pluginCodeCache.set(plugin.entryPoint, code);
                }
            } else if (plugin.type === 'external') {
                // For external plugins, we don't load code, but create a proxy module
                // The actual execution will happen in executeHook via a webhook call.
                const externalModule: PluginModule = {
                    name: plugin.name,
                    version: plugin.version,
                    description: plugin.description,
                    hooks: {
                        // A generic hook handler for external plugins
                        [plugin.entryPoint]: async (context: any) => {
                            try {
                                const response = await fetch(plugin.entryPoint, {
                                    method: 'POST',
                                    headers: {'Content-Type': 'application/json'},
                                    body: JSON.stringify({hookName: plugin.entryPoint, context}),
                                });
                                if (!response.ok) throw new Error(`External plugin webhook failed: ${response.statusText}`);
                                return await response.json();
                            } catch (error) {
                                console.error(`Error calling external plugin webhook ${plugin.name}:`, error);
                                return context; // Return original context on error
                            }
                        },
                    },
                };
                this.plugins.set(plugin._id, externalModule);
                return;
            } else {
                console.warn(`Unknown server-side plugin type: ${plugin.type} for plugin ${plugin.name}`);
                return;
            }

            const blob = new Blob([`return ${code}`], {type: 'text/javascript'});
            const objectUrl = URL.createObjectURL(blob);
            const module = new Function(await (await fetch(objectUrl)).text())();
            URL.revokeObjectURL(objectUrl);

            if (typeof module !== 'object') {
                throw new Error(`Plugin ${plugin.name} did not return a valid module object.`);
            }
            this.plugins.set(plugin._id, module);

        } catch (error) {
            console.error(`Error loading plugin ${plugin.name} (${plugin._id}):`, error);
        }
    }
}

const pluginExecutor = new PluginExecutor();
export default pluginExecutor;
''
