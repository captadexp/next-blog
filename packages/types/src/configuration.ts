import type {DatabaseAdapter} from './database/adapter';
import type {ConfigurationCallbacks} from './events';
import {CacheProvider} from "memoose-js";

export interface UIConfiguration {
    logo?: string;
    theme?: {
        primaryColor?: string;
        secondaryColor?: string;
        darkMode?: boolean;
    };
    branding?: {
        name?: string;
        description?: string;
    };
    features?: {
        comments?: boolean;
        search?: boolean;
        analytics?: boolean;
    };
    navigation?: {
        menuItems?: Array<{
            label: string;
            path: string;
            icon?: string;
        }>;
    };
}


export type SimpleKVStore = {
    get<T>(key: string): Promise<T>,
    set<T>(key: string, value: T, ttl: number): Promise<void>,
    del(key: string): Promise<void>
}

export interface Configuration {
    callbacks?: ConfigurationCallbacks;
    ui?: UIConfiguration;
    pathPrefix?: string;

    sessionStore?(): Promise<SimpleKVStore>

    cacheProvider?(): Promise<CacheProvider<any>>

    db(): Promise<DatabaseAdapter>;
}