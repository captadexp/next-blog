import type {ServerSDK} from "@supergrowthai/next-blog-types";

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
    constructor(message: string, public code: number = 400) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Custom error class for unsupported operations
 */
export class UnsupportedError extends Error {
    constructor(message: string, public code: number = 400) {
        super(message);
        this.name = 'UnsupportedError';
    }
}

/**
 * Custom error class for client-side operation errors
 */
export class ClientError extends Error {
    constructor(message: string, public operation: string) {
        super(message);
        this.name = 'ClientError';
        this.operation = operation;
    }
}

/**
 * Wrapper for RPC handlers to catch errors and return proper response format
 */
export function handleRPC<T, R>(handler: (sdk: ServerSDK, p: T) => Promise<R>) {
    return async (sdk: ServerSDK, p: T): Promise<RPCResponse<R>> => {
        try {
            const result = await handler(sdk, p) as R;
            return {code: 0, message: 'ok', payload: result};
        } catch (error: any) {
            if (error instanceof ValidationError || error instanceof UnsupportedError) {
                return {code: error.code, message: error.message};
            }
            // Unknown errors get code 500
            return {code: 500, message: error?.message as string || 'Internal error'};
        }
    }
}

/**
 * Client-side RPC response types
 */
export interface RPCResponse<T> {
    code: number;
    message: string;
    payload?: T;
}

/**
 * Handle RPC responses with proper error extraction
 */
export function handleRPCResponse<T = any>(response: RPCResponse<T>): T | null {
    if (response?.code !== undefined && response.code !== 0) {
        throw new ValidationError(response.message || 'Validation failed');
    }

    return response.payload || null;
}