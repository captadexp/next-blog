import {
    DatabaseAdapter,
    Plugin,
    PluginHookMapping,
    ServerPluginModule,
    ServerSDK
} from "@supergrowthai/next-blog-types/server";
import Logger, {LogLevel} from "../utils/Logger.js";
import pluginManager from "./pluginManager.js";
import {ServerSDKFactory} from "./sdk-factory.server.js";
import {initializeSettingsHelper} from "./settings-helper.server.js";
import {VERSION_INFO} from "../version.js";
import {getSystemPluginId} from "../utils/defaultSettings.js";

/**
 * Matches hook names against patterns
 * @param hookName The actual hook name
 * @param pattern The pattern to match against (can include * wildcards)
 * @returns true if the hook name matches the pattern
 */
function matchesHookPattern(hookName: string, pattern: string): boolean {
    // Direct match
    if (hookName === pattern) return true;

    // Convert pattern to regex (e.g., "dashboard-*-header" -> /^dashboard-[^-]+-header$/)
    const regexPattern = pattern
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
        .replace(/\\\*/g, '[^-]+') // Replace * with non-dash matcher
        .replace(/{([^}]+)}/g, '([^-]+)'); // Replace {var} with capture group

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(hookName);
}

/**
 * Server-side plugin executor
 * Handles loading and executing server-side plugins.
 */
export class PluginExecutor {
    public initialized = false;
    private plugins: Map<string, ServerPluginModule> = new Map();
    private db: DatabaseAdapter | null = null;
    private pluginModuleCache: Map<string, ServerPluginModule> = new Map();
    private logger = new Logger('PluginExecutor', LogLevel.ERROR);
    private sdkFactory: ServerSDKFactory | null = null;
    private hookIndex: {
        exact: Map<string, PluginHookMapping[]>;
        patterns: Map<string, PluginHookMapping[]>;
    } = {exact: new Map(), patterns: new Map()};
    private rpcIndex: {
        exact: Map<string, PluginHookMapping[]>;
        patterns: Map<string, PluginHookMapping[]>;
    } = {exact: new Map(), patterns: new Map()};

    async initialize(db: DatabaseAdapter) {
        if (process.env.NODE_ENV === "production" && this.initialized) return;

        this.db = db;

        // Initialize SDK factory with dependencies
        this.sdkFactory = new ServerSDKFactory({
            db,
            log: this.logger,
            pluginExecutor: this
        });

        // Initialize settings helper for backwards compatibility
        initializeSettingsHelper(db);

        this.plugins = new Map();
        this.pluginModuleCache = new Map();
        this.hookIndex = {exact: new Map(), patterns: new Map()};
        this.rpcIndex = {exact: new Map(), patterns: new Map()};

        await this.loadPlugins();

        // Set initialized flag only after all loading is complete
        this.initialized = true;
    }

    hasHook(hookName: string): boolean {
        // O(1) exact match check
        if (this.hookIndex.exact.has(hookName)) {
            return true;
        }

        // Check patterns
        for (const pattern of this.hookIndex.patterns.keys()) {
            if (matchesHookPattern(hookName, pattern)) {
                return true;
            }
        }

        return false;
    }

    hasRpc(rpcName: string): boolean {
        // O(1) exact match check
        if (this.rpcIndex.exact.has(rpcName)) {
            return true;
        }

        // Check patterns
        for (const pattern of this.rpcIndex.patterns.keys()) {
            if (matchesHookPattern(rpcName, pattern)) {
                return true;
            }
        }

        return false;
    }

    async executeHook(hookName: string, sdk: ServerSDK, context: Record<string, any> = {}): Promise<Record<string, any>> {
        this.logger.time(`Executing hook: ${hookName}`);
        this.logger.info(`Executing hook: ${hookName}`);

        // Find all mappings that match the hook pattern using index
        const matchingMappings: PluginHookMapping[] = [];
        const seenPlugins = new Set<string>();

        // O(1) exact match lookup
        if (this.hookIndex.exact.has(hookName)) {
            const exactMatches = this.hookIndex.exact.get(hookName)!;
            exactMatches.forEach(mapping => {
                if (!seenPlugins.has(mapping.pluginId)) {
                    matchingMappings.push(mapping);
                    seenPlugins.add(mapping.pluginId);
                }
            });
        }

        // Check patterns (much smaller set than all hooks)
        for (const [pattern, mappings] of this.hookIndex.patterns) {
            if (matchesHookPattern(hookName, pattern)) {
                this.logger.debug(`Hook ${hookName} matches pattern ${pattern}`);
                mappings.forEach(mapping => {
                    if (!seenPlugins.has(mapping.pluginId)) {
                        matchingMappings.push(mapping);
                        seenPlugins.add(mapping.pluginId);
                    }
                });
            }
        }

        if (matchingMappings.length === 0) {
            this.logger.debug(`No hook mappings found for hook: ${hookName}`);
            return context;
        }

        // Sort by priority (lower number = higher priority)
        matchingMappings.sort((a, b) => (a.priority || 10) - (b.priority || 10));

        let currentContext = context;
        for (const mapping of matchingMappings) {
            await this.runMapping(mapping, hookName, sdk, currentContext, 'hooks', (newContext) => {
                currentContext = newContext;
            });
        }

        this.logger.timeEnd(`Executing hook: ${hookName}`);
        this.logger.info(`Finished executing hook: ${hookName}`);
        return currentContext;
    }

    async executeRpc(rpcName: string, sdk: ServerSDK, context: Record<string, any> = {}): Promise<Record<string, any>> {
        this.logger.time(`Executing rpc: ${rpcName}`);
        this.logger.info(`Executing rpc: ${rpcName}`);


        // Use index for O(1) lookup
        const matchingMappings: PluginHookMapping[] = [];
        const seenPlugins = new Set<string>();

        // O(1) exact match lookup
        if (this.rpcIndex.exact.has(rpcName)) {
            const exactMatches = this.rpcIndex.exact.get(rpcName)!;
            exactMatches.forEach(mapping => {
                if (!seenPlugins.has(mapping.pluginId)) {
                    matchingMappings.push(mapping);
                    seenPlugins.add(mapping.pluginId);
                }
            });
        }

        // Check patterns for RPCs
        for (const [pattern, mappings] of this.rpcIndex.patterns) {
            if (matchesHookPattern(rpcName, pattern)) {
                mappings.forEach(mapping => {
                    if (!seenPlugins.has(mapping.pluginId)) {
                        matchingMappings.push(mapping);
                        seenPlugins.add(mapping.pluginId);
                    }
                });
            }
        }

        if (matchingMappings.length === 0) {
            this.logger.warn(`No RPC mappings found for: ${rpcName}`);
            throw new Error(`No RPC mappings found for RPC: ${rpcName}`);
        }

        let currentContext = context;
        for (const mapping of matchingMappings) {
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
        sdk: ServerSDK,
        context: Record<string, any>,
        type: 'hooks' | 'rpcs',
        updateContext: (ctx: Record<string, any>) => void
    ) {
        const label = `${type} ${hookName} for plugin ${mapping.pluginId}`;
        this.logger.time(label);
        this.logger.debug(`Running ${label}`);
        try {
            if (!this.db || !this.sdkFactory) {
                this.logger.error('Database or SDK factory not initialized');
                return;
            }

            const pluginEntry = await this.db.plugins.findById(mapping.pluginId);
            if (!pluginEntry) {
                this.logger.warn(`Plugin ${mapping.pluginId} not found`);
                return;
            }
            const module = this.plugins.get(mapping.pluginId);
            if (!module || typeof module[type]?.[hookName] !== 'function') {
                this.logger.warn(`No ${type} function for ${hookName} in plugin ${mapping.pluginId}`);
                return;
            }

            // Create plugin-specific SDK using the factory
            const pluginSDK = await this.sdkFactory.createSDK(pluginEntry);

            const result = await module[type][hookName](pluginSDK, context);
            updateContext(result);
        } catch (err) {
            this.logger.error(`Error in ${type} ${hookName} for plugin ${mapping.pluginId}:`, err);
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

            // Build indexes for O(1) lookups
            for (const mapping of allMappings) {
                const index = mapping.type === 'rpc' ? this.rpcIndex : this.hookIndex;

                if (mapping.hookName.includes('*')) {
                    // Pattern-based hook
                    if (!index.patterns.has(mapping.hookName)) {
                        index.patterns.set(mapping.hookName, []);
                    }
                    index.patterns.get(mapping.hookName)!.push(mapping);
                } else {
                    // Exact match hook
                    if (!index.exact.has(mapping.hookName)) {
                        index.exact.set(mapping.hookName, []);
                    }
                    index.exact.get(mapping.hookName)!.push(mapping);
                }
            }

            this.logger.info(`Loaded ${this.plugins.size} plugins.`);
            this.logger.info(`Hook index built: ${this.hookIndex.exact.size} exact hooks, ${this.hookIndex.patterns.size} pattern hooks`);
            this.logger.info(`RPC index built: ${this.rpcIndex.exact.size} exact RPCs, ${this.rpcIndex.patterns.size} pattern RPCs`);

            // Automatically call plugins:loaded hook after plugins are loaded
            if (this.hasHook('plugins:loaded')) {
                try {
                    await this.callProxySystemInitHook();
                } catch (error) {
                    this.logger.error('Error calling plugins:loaded hook:', error);
                }
            }
        } catch (error) {
            this.logger.error('Error loading plugins:', error);
        }
    }

    private async loadPlugin(plugin: Plugin) {
        this.logger.time(`Loading plugin: ${plugin.name}`);
        this.logger.info(`Loading plugin: ${plugin.name}`);
        try {
            if (!plugin.server) return
            let module: ServerPluginModule;
            const url = plugin.server.url;

            // Skip caching for devMode plugins
            if (plugin.devMode) {
                this.logger.debug(`DevMode enabled for ${plugin.name}, skipping cache`);
                module = await pluginManager.loadPluginModule(url);
            } else if (this.pluginModuleCache.has(url)) {
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

    /**
     * Call plugins:loaded hook with current version information
     */
    private async callProxySystemInitHook() {
        if (!this.sdkFactory || !this.db) {
            this.logger.error('SDK factory or database not initialized');
            return;
        }

        try {
            const systemPluginId = await getSystemPluginId(this.db);
            const systemPlugin = await this.db.plugins.findById(systemPluginId);
            if (!systemPlugin) {
                this.logger.error('System plugin not found');
                return;
            }

            // Use the plugin's manifest ID (stored in 'id' field) for settings persistence
            const sdk = await this.sdkFactory.createSDK(systemPlugin);

            const payload = {
                currentVersion: VERSION_INFO.version,
                timestamp: Date.now()
            };

            this.logger.info(`Calling plugins:loaded hook with version ${payload.currentVersion}`);
            await this.executeHook('plugins:loaded', sdk, payload);
        } catch (error) {
            this.logger.error('Failed to call plugins:loaded hook:', error);
        }
    }
}

const pluginExecutor = new PluginExecutor();
export default pluginExecutor;