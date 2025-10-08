import {defineConfig, type UserConfig} from 'vite';
import {resolve} from 'path';
import {existsSync, readFileSync} from 'fs';
import type {ViteConfigOptions} from './types.js';
import tailwindcss from '@tailwindcss/vite';
import {
    createCssInjectionPlugin,
    createCssModuleTypesPlugin,
    createIifeWrapperPlugin,
    createVersionInjectionPlugin
} from './plugins';


/**
 * Gets the package.json data for the plugin
 */
function getPackageInfo(root: string) {
    const packageJsonPath = resolve(root, 'package.json');
    return existsSync(packageJsonPath)
        ? JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
        : {};
}

/**
 * Checks which plugin entry points exist
 */
function getAvailableEntryPoints(root: string) {
    return {
        hasClient: existsSync(resolve(root, 'src', 'client.tsx')) ||
            existsSync(resolve(root, 'src', 'client.ts')),
        hasServer: existsSync(resolve(root, 'src', 'server.ts'))
    };
}

/**
 * Creates the base Vite configuration shared by all build types
 */
function createBaseConfig(options: ViteConfigOptions): UserConfig {
    const {root, outDir, mode = 'production', watch = false, server} = options;
    const isProduction = mode === 'production';

    return {
        root,
        mode,
        server,
        define: {
            'process.env.NODE_ENV': JSON.stringify(mode),
        },
        resolve: {
            alias: {
                '@': resolve(root, 'src'),
            },
        },
        build: {
            watch: watch ? {} : undefined,
            minify: isProduction,
            sourcemap: !isProduction,
            outDir: resolve(root, outDir),
            emptyOutDir: false,
        },
    };
}

/**
 * Creates IIFE build configuration for any plugin type
 */
function createIifeBuildConfig(
    entry: string,
    fileName: string,
    libName: string,
    exportType: 'default' | 'auto' = 'auto',
    external: string[] = []
) {
    return {
        lib: {
            entry,
            formats: ['iife'] as ('iife')[],
            name: libName,
            fileName: () => fileName,
        },
        rollupOptions: {
            external,
            output: {
                format: 'iife' as const,
                entryFileNames: fileName,
                extend: false,
                exports: exportType,
                ...(external.includes('@supergrowthai/jsx-runtime') && {
                    globals: {'@supergrowthai/jsx-runtime': 'PluginRuntime'}
                })
            },
            treeshake: {
                moduleSideEffects: false,
                propertyReadSideEffects: false
            }
        },
    };
}

export function createViteConfig(options: ViteConfigOptions): UserConfig {
    const {root, entry, type, mode = 'production'} = options;
    const baseConfig = createBaseConfig(options);
    const packageJson = getPackageInfo(root);
    const wrapIifePlugin = createIifeWrapperPlugin();
    const isDevelopment = mode === 'development';

    switch (type) {
        case 'plugin': {
            const {hasClient, hasServer} = getAvailableEntryPoints(root);
            const versionPlugin = createVersionInjectionPlugin(entry, packageJson.version);
            const plugins = [versionPlugin, wrapIifePlugin];

            return defineConfig({
                ...baseConfig,
                define: {
                    ...baseConfig.define,
                    '__PLUGIN_BASE_URL__': JSON.stringify(process.env.PLUGIN_BASE_URL || null),
                    '__HAS_CLIENT__': String(hasClient),
                    '__HAS_SERVER__': String(hasServer),
                    '__DEV_MODE__': String(isDevelopment)
                },
                plugins,
                build: {
                    ...baseConfig.build,
                    ...createIifeBuildConfig(entry, 'plugin.js', 'PluginExport', 'default'),
                },
            });
        }

        case 'server': {
            return defineConfig({
                ...baseConfig,
                plugins: [wrapIifePlugin],
                build: {
                    ...baseConfig.build,
                    ...createIifeBuildConfig(entry, 'server.js', 'ServerExport', 'auto', []),
                    target: 'esnext',
                },
            });
        }

        case 'client': {
            const cssInjectionPlugin = createCssInjectionPlugin();
            const clientPlugins = [createCssModuleTypesPlugin(root), wrapIifePlugin, cssInjectionPlugin];

            const tailwindPlugin = tailwindcss();
            clientPlugins.unshift(...tailwindPlugin);

            return defineConfig({
                ...baseConfig,
                plugins: clientPlugins,
                build: {
                    ...baseConfig.build,
                    ...createIifeBuildConfig(
                        entry,
                        'client.js',
                        'ClientExport',
                        'auto',
                        [
                            '@supergrowthai/jsx-runtime'
                        ]
                    ),
                    cssCodeSplit: false,
                },
                esbuild: {
                    jsx: 'transform',
                    jsxFactory: 'jsx',
                    jsxFragment: 'Fragment',
                    jsxInject: `const {jsx, jsxs, Fragment} = window.PluginRuntime;`,
                },
            });
        }

        default:
            throw new Error(`Unknown build type: ${type}`);
    }
}