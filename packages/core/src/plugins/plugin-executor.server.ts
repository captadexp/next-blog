import {DatabaseAdapter, Plugin, PluginHookMapping, PluginModule} from "../types.ts";
import Logger, {LogLevel} from "../utils/Logger.js";
import pluginManager from "./pluginManager.js";

/**
 * Server-side plugin executor
 * Handles loading and executing server-side plugins.
 */
class PluginExecutor {
    private plugins: Map<string, PluginModule> = new Map();
    private hookMappings: Map<string, PluginHookMapping[]> = new Map();
    public initalized = false;
    private rpcMappings: Map<string, PluginHookMapping[]> = new Map();
    private db: DatabaseAdapter | null = null;
    private pluginModuleCache: Map<string, PluginModule> = new Map();
    private logger = new Logger('PluginExecutor', LogLevel.ERROR);

    async initialize(db: DatabaseAdapter) {
        if (this.initalized) return;
        this.initalized = true;
        this.db = db;

        this.plugins = new Map();
        this.hookMappings = new Map();
        this.rpcMappings = new Map();
        this.pluginModuleCache = new Map();
        await this.loadPlugins();
    }

    async executeHook(hookName: string, sdk: any, context: any = {}): Promise<any> {
        this.logger.time(`Executing hook: ${hookName}`);
        this.logger.info(`Executing hook: ${hookName}`);
        if (!this.hookMappings.has(hookName)) {
            this.logger.warn(`No hook mappings found for hook: ${hookName}`);
            return context;
        }

        let currentContext = context;
        const mappings = this.hookMappings.get(hookName)!;

        for (const mapping of mappings) {
            await this.runMapping(mapping, hookName, sdk, currentContext, 'hooks', (newContext) => {
                currentContext = newContext;
            });
        }

        this.logger.timeEnd(`Executing hook: ${hookName}`);
        this.logger.info(`Finished executing hook: ${hookName}`);
        return currentContext;
    }

    async executeRpc(rpcName: string, sdk: any, context: any = {}): Promise<any> {
        this.logger.time(`Executing rpc: ${rpcName}`);
        this.logger.info(`Executing rpc: ${rpcName}`);
        if (!this.rpcMappings.has(rpcName)) {
            this.logger.warn(`No RPC mappings found for: ${rpcName}`);
            return context;
        }

        let currentContext = context;
        const mappings = this.rpcMappings.get(rpcName)!;

        console.log(mappings.join(", "))

        for (const mapping of mappings) {
            await this.runMapping(mapping, rpcName, sdk, currentContext, 'rpcs', (newContext) => {
                currentContext = newContext;
            });
        }

        this.logger.timeEnd(`Executing rpc: ${rpcName}`);
        this.logger.info(`Finished executing rpc: ${rpcName}`);
        return currentContext;
    }

    private async runMapping(
        mapping: PluginHookMapping,
        hookName: string,
        sdk: any,
        context: any,
        type: 'hooks' | 'rpcs',
        updateContext: (ctx: any) => void
    ) {
        const label = `${type} ${hookName} for plugin ${mapping.pluginId}`;
        this.logger.time(label);
        this.logger.debug(`Running ${label}`);
        try {
            const pluginEntry = this.db!.plugins.findById(mapping.pluginId);
            if (!pluginEntry) {
                this.logger.warn(`Plugin ${mapping.pluginId} not found`);
                return;
            }
            const module = this.plugins.get(mapping.pluginId);
            if (!module || typeof module[type]?.[hookName] !== 'function') {
                this.logger.warn(`No ${type} function for ${hookName} in plugin ${mapping.pluginId}`);
                return;
            }
            const result = await module[type][hookName](sdk, context);
            updateContext(result);
        } catch (err) {
            this.logger.error(`Error in ${label}:`, err);
        } finally {
            this.logger.timeEnd(label);
        }
    }

    private async loadPlugins() {
        if (!this.db) return;
        this.logger.info('Loading plugins...');
        try {
            const allPlugins = await this.db.plugins.find({});
            await Promise.all(allPlugins.map(p => this.loadPlugin(p)));

            const allMappings = await this.db.pluginHookMappings.find({});

            for (const mapping of allMappings) {
                const map = mapping.type === 'rpc' ? this.rpcMappings : this.hookMappings;
                if (!map.has(mapping.hookName))
                    map.set(mapping.hookName, []);
                map.get(mapping.hookName)!.push(mapping);
            }


            this.logger.info(`Loaded ${this.plugins.size} plugins.`);
        } catch (error) {
            this.logger.error('Error loading plugins:', error);
        }
    }

    private async loadPlugin(plugin: Plugin) {
        this.logger.time(`Loading plugin: ${plugin.name}`);
        this.logger.info(`Loading plugin: ${plugin.name}`);
        try {
            if (!plugin.server) throw new Error("Missing server module URL");
            let module: PluginModule;
            const url = plugin.server.url;
            if (this.pluginModuleCache.has(url)) {
                this.logger.debug(`Cache hit for ${plugin.name}`);
                module = this.pluginModuleCache.get(url)!;
            } else {
                this.logger.debug(`Fetching module for ${plugin.name}`);
                module = await pluginManager.loadPluginModule(url);
                this.pluginModuleCache.set(url, module);
                this.logger.debug(`Cached module for ${plugin.name}`);
            }
            this.plugins.set(plugin._id, module);
            this.logger.info(`Plugin ${plugin.name} loaded`);
        } catch (error) {
            this.logger.error(`Error loading plugin ${plugin.name}:`, error);
        } finally {
            this.logger.timeEnd(`Loading plugin: ${plugin.name}`);
        }
    }
}

const pluginExecutor = new PluginExecutor();
export default pluginExecutor;