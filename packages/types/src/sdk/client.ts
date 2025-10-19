/**
 * Client-side SDK interface for browser plugins
 */

import type {BaseSDK, Logger, PluginCache, PluginEvents, PluginSettings, SystemInfo} from './base';
import type {User} from '../database/entities';
import type {CallClientHookFunction, CallClientRPCFunction, ClientHooks, RPCMethods} from '../plugin/client';
import type {APIClient} from '../api';

export type * from "./base"

// Storage interface for client-side persistence
export interface Storage {
    get(key: string): any;

    set(key: string, value: any): void;

    remove(key: string): void;

    clear(): void;
}

// Notification options
export type NotificationStatus = 'success' | 'error' | 'info' | 'warning';

export interface ClientSDKUtils {
    classList(...classes: (string | undefined | null | false)[]): string;

    styles(styles: Record<string, string | number>): string;

    debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T;

    throttle<T extends (...args: any[]) => any>(fn: T, delay: number): T;

    formatDate(date: Date | string | number, format?: string): string;

    formatNumber(num: number, options?: Intl.NumberFormatOptions): string;
}

// Client SDK extending base SDK with client-specific features
export interface ClientSDK extends BaseSDK {
    log: Logger;
    settings: PluginSettings;
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

    startIntent: <T, R>(intentType: string, payload: T) => Promise<R>;

    callRPC: CallClientRPCFunction<RPCMethods>;

    callHook: CallClientHookFunction<ClientHooks>;

    system: SystemInfo;
}