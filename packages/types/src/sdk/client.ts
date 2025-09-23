/**
 * Client-side SDK interface for browser plugins
 */

import type {BaseSDK, PluginCache, PluginEvents} from './base';
import type {User} from '../database/entities';
import type {ClientHooks} from '../plugin';
import type {APIClient} from '../api';

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

    // Override callHook with client-specific types
    // Simplified to single signature since ClientHooks now has string index signature
    callHook: (hookName: string, payload: any) => Promise<any>;
}

// Type for client-side hook functions
export type ClientPluginHook<T extends keyof ClientHooks = keyof ClientHooks> = (
    sdk: ClientSDK,
    payload: ClientHooks[T]['payload']
) => Promise<ClientHooks[T]['response']> | ClientHooks[T]['response'];

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