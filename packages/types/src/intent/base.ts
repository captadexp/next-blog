/**
 * Base intent system interfaces
 */

export interface IntentRequest<T = any> {
    requestId: string;
    intentType: string;
    payload: T;
}

export interface IntentResponse<T = any> {
    requestId: string;
    intentType: string;
    success: boolean;
    payload?: T;
    error?: string;
    cancelled?: boolean;
}

export type LaunchMode = 'replace' | 'stack';

export interface IntentConfig {
    intentType: string;
    launch?: LaunchMode; // defaults to 'replace'
}