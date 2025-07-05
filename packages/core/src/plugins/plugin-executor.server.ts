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

    async executeHook(hookName: string, sdk: any, context: any = {}): Promise<any> {
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

                const pluginModule = this.plugins.get(mapping.pluginId);
                if (!pluginModule) {
                    console.warn(`Plugin module ${mapping.pluginId} not loaded for hook ${hookName}`);
                    continue;
                }

                if (pluginModule.hooks && typeof pluginModule.hooks[hookName] === 'function') {
                    currentContext = await pluginModule.hooks[hookName](sdk, currentContext);
                }
            } catch (error) {
                console.error(`Error executing plugin for hook ${hookName}:`, error);
            }
        }
        return currentContext;
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
            if (this.pluginCodeCache.has(plugin.url)) {
                code = this.pluginCodeCache.get(plugin.url)!;
            } else {
                const response = await fetch(plugin.url);
                if (!response.ok) throw new Error(`Fetch failed for plugin ${plugin.name}: ${response.statusText}`);
                code = await response.text();
                this.pluginCodeCache.set(plugin.url, code);
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
