export interface PluginSettings {
    get<T = any>(key: string): T | null | Promise<T | null>;

    set<T = any>(key: string, value: T, config?: { isSecure: boolean }): void | Promise<void>;

    getGlobal<T = any>(key: string): T | null | Promise<T | null>;

    setGlobal<T = any>(key: string, value: T, config?: { isSecure: boolean }): void | Promise<void>;

    getFromPlugin<T = any>(pluginId: string, key: string): T | null | Promise<T | null>;
}

export interface PluginCache {
    get<T = any>(key: string): T | null | Promise<T | null>;

    set<T = any>(key: string, value: T, ttl?: number): void | Promise<void>;

    delete(key: string): void | Promise<void>;

    clear(): void | Promise<void>;

    has(key: string): boolean | Promise<boolean>;
}

export interface PluginEvents {
    emit(event: string, data?: any): void | Promise<void>;

    on(event: string, handler: (data: any) => void): void;

    onGlobal(event: string, handler: (data: any) => void): void;

    off(event: string, handler?: (data: any) => void): void;

    once(event: string, handler: (data: any) => void): void;
}


export interface BaseSDK {
    pluginId: string;
}

export interface Logger {
    debug(...args: any[]): void;

    info(...args: any[]): void;

    warn(...args: any[]): void;

    error(...args: any[]): void;

    time?(label: string): void;

    timeEnd?(label: string): void;
}


export function isServerSDK(sdk: any): sdk is import('./server').ServerSDK {
    return sdk && typeof sdk === 'object' && 'db' in sdk && 'log' in sdk;
}

export function isClientSDK(sdk: any): sdk is import('./client').ClientSDK {
    return sdk && typeof sdk === 'object' && 'apis' in sdk && 'navigate' in sdk;
}

export interface SystemInfo {
    version: string;
    buildTime: string;
    buildMode: string;
}