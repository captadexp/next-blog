import {Exception} from "@supergrowthai/oneapi";

/**
 * Plugin error codes - unique negative numbers for client-side reconstruction
 */
export const PLUGIN_ERROR_CODES = {
    PLUGIN_NOT_FOUND: -1001,
    PLUGIN_MODULE_ERROR: -1002,
    PLUGIN_RPC_ERROR: -1003,
    PLUGIN_HOOK_ERROR: -1004,
    PLUGIN_INITIALIZATION_ERROR: -1005,
    RPC_HANDLER_NOT_FOUND: -1006,
} as const;

export type PluginErrorCode = typeof PLUGIN_ERROR_CODES[keyof typeof PLUGIN_ERROR_CODES];

/**
 * Base class for all plugin-related errors
 */
export abstract class PluginError extends Exception {
    protected constructor(code: number, message: string, public pluginId?: string, public operation?: string) {
        const payload = {pluginId, operation, errorType: code};
        super(code, message, payload);
        this.name = 'PluginError';
    }
}

/**
 * Thrown when a plugin is not found in the database
 */
export class PluginNotFoundError extends PluginError {
    constructor(pluginId: string, operation?: string) {
        super(PLUGIN_ERROR_CODES.PLUGIN_NOT_FOUND, `Plugin ${pluginId} not found`, pluginId, operation);
        this.name = 'PluginNotFoundError';
    }
}

/**
 * Thrown when plugin module loading or execution fails
 */
export class PluginModuleError extends PluginError {
    constructor(message: string, pluginId?: string, operation?: string) {
        super(PLUGIN_ERROR_CODES.PLUGIN_MODULE_ERROR, message, pluginId, operation);
        this.name = 'PluginModuleError';
    }
}

/**
 * Thrown when an RPC function doesn't exist or execution fails
 */
export class PluginRpcError extends PluginError {
    constructor(message: string, pluginId?: string, public rpcName?: string) {
        super(PLUGIN_ERROR_CODES.PLUGIN_RPC_ERROR, message, pluginId, 'rpc');
        this.payload = {...this.payload, rpcName};
        this.name = 'PluginRpcError';
    }
}

/**
 * Thrown when a hook function doesn't exist (not used for execution failures, as hooks swallow errors)
 */
export class PluginHookError extends PluginError {
    constructor(message: string, pluginId?: string, public hookName?: string) {
        super(PLUGIN_ERROR_CODES.PLUGIN_HOOK_ERROR, message, pluginId, 'hook');
        this.payload = {...this.payload, hookName};
        this.name = 'PluginHookError';
    }
}

/**
 * Thrown when SDK factory or database is not properly initialized
 */
export class PluginInitializationError extends PluginError {
    constructor(message: string = 'Plugin system not properly initialized', operation?: string) {
        super(PLUGIN_ERROR_CODES.PLUGIN_INITIALIZATION_ERROR, message, undefined, operation);
        this.name = 'PluginInitializationError';
    }
}

/**
 * Thrown when an RPC handler is not found for a given RPC name
 */
export class RpcHandlerNotFoundError extends PluginError {
    constructor(rpcName: string) {
        super(PLUGIN_ERROR_CODES.RPC_HANDLER_NOT_FOUND, `No RPC handler found for: ${rpcName}`, undefined, 'rpc');
        this.payload = {...this.payload, rpcName};
        this.name = 'RpcHandlerNotFoundError';
    }
}