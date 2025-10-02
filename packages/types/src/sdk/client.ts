/**
 * Client-side SDK interface for browser plugins
 */

import type {BaseSDK, PluginCache, PluginEvents} from './base';
import type {User} from '../database/entities';
import type {CallClientHookFunction, CallClientRPCFunction, ClientHooks, RPCMethods} from '../plugin';
import type {APIClient} from '../api';
import {SystemInfo} from "./server";

// Storage interface for client-side persistence
export interface Storage {
    get(key: string): any;

    set(key: string, value: any): void;

    remove(key: string): void;

    clear(): void;
}

// Notification options
export type NotificationStatus = 'success' | 'error' | 'info' | 'warning';

// Utility functions available to plugins
export interface ClientSDKUtils {
    debounce: <T extends (...args: any[]) => any>(
        func: T,
        delay: number
    ) => (...args: Parameters<T>) => void;

    [key: string]: any; // Allow for additional utilities
}

// Client SDK extending base SDK with client-specific features
export interface ClientSDK extends BaseSDK {
    // Client-specific properties
    apis: APIClient;
    user: User | null;
    storage?: Storage; // Optional as not all implementations have it
    utils?: ClientSDKUtils; // Utility functions

    // Optional enhanced features (implemented with fingerprinting)
    cache?: PluginCache;
    events?: PluginEvents;

    // UI interaction methods
    notify: (message: string, status?: NotificationStatus) => void;
    refresh: () => void;
    navigate?: (path: string) => void; // Optional as not all implementations have it

    callRPC: CallClientRPCFunction<RPCMethods>;

    callHook: CallClientHookFunction<ClientHooks>;

    system: SystemInfo;
}

// JSX Element type for UI rendering
export type JSXElement = {
    $$typeof: symbol;
    type: string | symbol | Function;
    props: Record<string, any>;
    key: string | number | null;
} & any

// UI Hook function signature
export type UIHookFn = (
    sdk: ClientSDK,
    prev?: any,
    context?: Record<string, any>
) => JSXElement | null;