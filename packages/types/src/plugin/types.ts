/**
 * Unified type definitions for hooks and RPCs
 * This is the single source of truth for function signatures
 */

import type {ServerSDK} from '../sdk/server';
import {ClientSDK} from '../sdk/client';

/**
 * Hook method definition
 */
export interface HookDefinition {
    payload?: any;
    response: any;
}

/**
 * RPC method definition
 */
export interface RPCDefinition {
    request?: any;
    response: any;
}

/**
 * Generic method definition (for backward compatibility)
 */
export type MethodDefinition = HookDefinition | RPCDefinition;

/**
 * Server hook function signature
 */
export type ServerHookFunction<T extends HookDefinition> = (
    sdk: ServerSDK,
    payload: T['payload']
) => Promise<T['response']> | T['response'];

/**
 * Client hook function signature (UI hooks)
 */
export type ClientHookFunction<T extends HookDefinition = HookDefinition> = (
    sdk: ClientSDK,
    prev?: T['response'],
    context?: Record<string, any>
) => any | null;

/**
 * RPC function signature for server
 */
export type ServerRPCFunction<T extends RPCDefinition> = (
    sdk: ServerSDK,
    request: T['request']
) => Promise<T['response']>;

/**
 * RPC function signature for client
 */
export type ClientRPCFunction<T extends RPCDefinition> = (
    sdk: ClientSDK,
    request: T['request']
) => Promise<T['response']>;

/**
 * Function to call a hook from SDK (server)
 */
export type CallServerHookFunction<T extends Record<string, HookDefinition>> = <K extends keyof T>(
    hookName: K,
    payload: T[K]['payload']
) => Promise<T[K]['response']>;

/**
 * Function to call a hook from SDK (client)
 */
export type CallClientHookFunction<T extends Record<string, HookDefinition>> = <K extends keyof T>(
    hookName: K,
    request: T[K]['payload']
) => Promise<{ code: number, message: string, payload: T[K]['response'] }>;

/**
 * Function to call an RPC from SDK (server)
 */
export type CallServerRPCFunction<T extends Record<string, RPCDefinition>> = <K extends keyof T>(
    method: K,
    request: T[K]['request']
) => Promise<T[K]['response']>;

/**
 * Function to call an RPC from SDK (client)
 */
export type CallClientRPCFunction<T extends Record<string, RPCDefinition>> = <K extends keyof T>(
    method: K,
    request: T[K]['request']
) => Promise<{ code: number, message: string, payload: T[K]['response'] }>;

/**
 * Server hooks definition using unified types
 */
export type ServerHooksDefinition<T extends Record<string, HookDefinition>> = {
    [K in keyof T]?: ServerHookFunction<T[K]>
};

/**
 * Client hooks definition using unified types
 */
export type ClientHooksDefinition<T extends Record<string, HookDefinition>> = {
    [K in keyof T]?: ClientHookFunction<any>
};

/**
 * Server RPCs definition using unified types
 */
export type ServerRPCsDefinition<T extends Record<string, RPCDefinition>> = {
    [K in keyof T]?: ServerRPCFunction<T[K]>
};

/**
 * Client RPCs definition using unified types
 */
export type ClientRPCsDefinition<T extends Record<string, RPCDefinition>> = {
    [K in keyof T]?: ClientRPCFunction<T[K]>
};