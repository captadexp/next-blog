export interface PluginBuildOptions {
    root?: string;
    outDir?: string;
}

export interface PluginWatchOptions extends PluginBuildOptions {
}

export interface PluginDevOptions {
    root?: string;
    port?: number;
}

export interface ViteConfigOptions {
    root: string;
    entry: string;
    outDir: string;
    type: 'plugin' | 'client' | 'server';
    mode?: 'development' | 'production';
    watch?: boolean;
    server?: {
        port: number;
        open: boolean;
    };
}