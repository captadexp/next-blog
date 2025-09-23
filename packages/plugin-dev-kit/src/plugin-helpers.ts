export interface PluginConfig {
    id: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
    repository?: string;
    keywords?: string[];
    slots?: string[];
    permissions?: string[];
    config?: Record<string, any>;
    dependencies?: Record<string, string>;
    clientEntry?: string;
    serverEntry?: string;
}

export function definePlugin(config: PluginConfig): PluginConfig {
    return {
        clientEntry: 'client.js',
        serverEntry: 'server.js',
        ...config,
    };
}

export interface PluginContext {
    id: string;
    version: string;
    config: Record<string, any>;
    api: {
        fetch: typeof fetch;
        storage: {
            get: (key: string) => Promise<any>;
            set: (key: string, value: any) => Promise<void>;
            delete: (key: string) => Promise<void>;
        };
    };
}

export interface ServerContext extends PluginContext {
    database: {
        query: (sql: string, params?: any[]) => Promise<any>;
    };
    env: Record<string, string>;
}

export interface ClientContext extends PluginContext {
    ui: {
        showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
        showModal: (content: React.ReactNode) => void;
    };
    router: {
        push: (path: string) => void;
        replace: (path: string) => void;
    };
}