import {defineConfig, type UserConfig, type Plugin} from 'vite';
import {resolve} from 'path';
import {readFileSync, existsSync} from 'fs';
import type {ViteConfigOptions} from './types.js';

/**
 * Creates a plugin that removes variable assignments from IIFE output
 * Transforms `var Name = (function(){})()` to `(function(){})()`
 */
function createIifeWrapperPlugin(): Plugin {
    return {
        name: 'wrap-iife',
        generateBundle(_options, bundle) {
            for (const fileName in bundle) {
                if (bundle[fileName].type === 'chunk') {
                    bundle[fileName].code = bundle[fileName].code.replace(
                        /^var\s+\w+\s*=\s*/,
                        ''
                    );
                }
            }
        }
    };
}

/**
 * Creates a plugin that injects the actual version from package.json
 */
function createVersionInjectionPlugin(version: string): Plugin {
    return {
        name: 'version-inject',
        transform(code: string, id: string) {
            if (id.endsWith('index.ts') || id.endsWith('index.js')) {
                return code.replace(
                    /version:\s*['"`][\d.]+['"`]/g,
                    `version: '${version}'`
                );
            }
            return null;
        },
    };
}

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
    const { root, outDir, mode = 'production', watch = false, server } = options;
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
                    globals: { '@supergrowthai/jsx-runtime': 'PluginRuntime' }
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
    const { root, entry, type } = options;
    const baseConfig = createBaseConfig(options);
    const packageJson = getPackageInfo(root);
    const wrapIifePlugin = createIifeWrapperPlugin();

    switch (type) {
        case 'plugin': {
            const { hasClient, hasServer } = getAvailableEntryPoints(root);
            const versionPlugin = createVersionInjectionPlugin(packageJson.version || '1.0.0');
            
            return defineConfig({
                ...baseConfig,
                define: {
                    ...baseConfig.define,
                    '__PLUGIN_BASE_URL__': JSON.stringify(process.env.PLUGIN_BASE_URL || null),
                    '__HAS_CLIENT__': String(hasClient),
                    '__HAS_SERVER__': String(hasServer)
                },
                plugins: [versionPlugin, wrapIifePlugin],
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
                    ...createIifeBuildConfig(entry, 'server.js', 'ServerExport'),
                    target: 'esnext',
                },
            });
        }

        case 'client': {
            return defineConfig({
                ...baseConfig,
                plugins: [wrapIifePlugin],
                build: {
                    ...baseConfig.build,
                    ...createIifeBuildConfig(
                        entry, 
                        'client.js', 
                        'ClientExport', 
                        'auto', 
                        ['@supergrowthai/jsx-runtime']
                    ),
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