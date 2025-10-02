import type {DatabaseAdapter} from './database/adapter';
import type {ConfigurationCallbacks} from './events';

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

export interface Configuration {
    callbacks?: ConfigurationCallbacks;
    ui?: UIConfiguration;
    db(): Promise<DatabaseAdapter>;
}