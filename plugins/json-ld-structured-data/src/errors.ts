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
export async function handleRpc<T>(
    handler: () => Promise<T>
): Promise<{ code: number; message: string; payload?: T }> {
    try {
        const result = await handler();
        return {code: 0, message: 'ok', payload: result};
    } catch (error) {
        if (error instanceof ValidationError || error instanceof UnsupportedError) {
            return {code: error.code, message: error.message};
        }
        // Unknown errors get code 500
        return {code: 500, message: error?.message || 'Internal error'};
    }
}

/**
 * Client-side RPC response types
 */
export interface RPCResponse {
    code: number;
    message: string;
    payload?: {
        code?: number;
        message?: string;
        payload?: any;
    };
}

/**
 * Handle RPC responses with proper error extraction
 */
export function handleRPCResponse<T>(response: RPCResponse): T | null {
    // Outer response failed
    if (response.code !== 0) {
        throw new ClientError(response.message, 'rpc-error');
    }

    // Inner response has validation error
    if (response.payload?.code !== undefined && response.payload.code !== 0) {
        throw new ValidationError(response.payload.message || 'Validation failed');
    }

    // Success case
    return response.payload?.payload || null;
}

export function isValidationError(error: unknown): boolean {
    return error instanceof ValidationError;
}

export function isClientError(error: unknown): boolean {
    return error instanceof ClientError;
}