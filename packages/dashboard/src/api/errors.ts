/**
 * Client-side error classes that mirror server-side plugin errors
 * These are reconstructed from API responses with non-zero codes
 */

/**
 * Plugin error codes - must match server-side codes
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
 * Base class for all plugin-related client errors
 */
export abstract class ClientPluginError extends Error {
    constructor(
        message: string,
        public code: number,
        public pluginId?: string,
        public operation?: string,
        public payload?: any
    ) {
        super(message);
        this.name = 'ClientPluginError';
    }
}

/**
 * Client-side version of PluginNotFoundError
 */
export class ClientPluginNotFoundError extends ClientPluginError {
    constructor(message: string, code: number = 404, pluginId?: string, operation?: string, payload?: any) {
        super(message, code, pluginId, operation, payload);
        this.name = 'ClientPluginNotFoundError';
    }
}

/**
 * Client-side version of PluginModuleError
 */
export class ClientPluginModuleError extends ClientPluginError {
    constructor(message: string, code: number = 500, pluginId?: string, operation?: string, payload?: any) {
        super(message, code, pluginId, operation, payload);
        this.name = 'ClientPluginModuleError';
    }
}

/**
 * Client-side version of PluginRpcError
 */
export class ClientPluginRpcError extends ClientPluginError {
    constructor(
        message: string,
        code: number = 404,
        pluginId?: string,
        public rpcName?: string,
        payload?: any
    ) {
        super(message, code, pluginId, 'rpc', payload);
        this.name = 'ClientPluginRpcError';
    }
}

/**
 * Client-side version of PluginHookError
 */
export class ClientPluginHookError extends ClientPluginError {
    constructor(
        message: string,
        code: number = 404,
        pluginId?: string,
        public hookName?: string,
        payload?: any
    ) {
        super(message, code, pluginId, 'hook', payload);
        this.name = 'ClientPluginHookError';
    }
}

/**
 * Client-side version of PluginInitializationError
 */
export class ClientPluginInitializationError extends ClientPluginError {
    constructor(message: string, code: number = 500, operation?: string, payload?: any) {
        super(message, code, undefined, operation, payload);
        this.name = 'ClientPluginInitializationError';
    }
}

/**
 * Client-side version of RpcHandlerNotFoundError
 */
export class ClientRpcHandlerNotFoundError extends ClientPluginError {
    constructor(message: string, code: number = 404, rpcName?: string, payload?: any) {
        super(message, code, undefined, 'rpc', payload);
        this.name = 'ClientRpcHandlerNotFoundError';
    }
}

/**
 * Generic API error for non-plugin-specific errors
 */
export class ClientApiError extends Error {
    constructor(
        message: string,
        public code: number,
        public payload?: any
    ) {
        super(message);
        this.name = 'ClientApiError';
    }
}

/**
 * Reconstructs appropriate error class based on error code
 */
export function reconstructError(response: { code: number; message: string; payload?: any }): Error {
    const {code, message, payload} = response;

    // Extract common payload properties
    const pluginId = payload?.pluginId;
    const operation = payload?.operation;
    const rpcName = payload?.rpcName;
    const hookName = payload?.hookName;

    // Use error code for precise error type detection
    switch (code) {
        case PLUGIN_ERROR_CODES.PLUGIN_NOT_FOUND:
            return new ClientPluginNotFoundError(message, code, pluginId, operation, payload);

        case PLUGIN_ERROR_CODES.PLUGIN_MODULE_ERROR:
            return new ClientPluginModuleError(message, code, pluginId, operation, payload);

        case PLUGIN_ERROR_CODES.PLUGIN_RPC_ERROR:
            return new ClientPluginRpcError(message, code, pluginId, rpcName, payload);

        case PLUGIN_ERROR_CODES.PLUGIN_HOOK_ERROR:
            return new ClientPluginHookError(message, code, pluginId, hookName, payload);

        case PLUGIN_ERROR_CODES.PLUGIN_INITIALIZATION_ERROR:
            return new ClientPluginInitializationError(message, code, operation, payload);

        case PLUGIN_ERROR_CODES.RPC_HANDLER_NOT_FOUND:
            return new ClientRpcHandlerNotFoundError(message, code, rpcName, payload);

        // Standard HTTP error codes
        case 400: // Bad Request
        case 401: // Unauthorized
        case 403: // Forbidden
        case 404: // Not Found (non-plugin)
        case 500: // Internal Server Error (non-plugin)
            return new ClientApiError(message, code, payload);

        // For any other code (including positive codes or unknown negative codes)
        default:
            return new ClientApiError(message, code, payload);
    }
}