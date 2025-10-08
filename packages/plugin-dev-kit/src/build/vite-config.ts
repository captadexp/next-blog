import {defineConfig, type Plugin, type UserConfig} from 'vite';
import {resolve} from 'path';
import {existsSync, readFileSync} from 'fs';
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
 * Creates a plugin that injects CSS into the IIFE for client builds
 */
function createCssInjectionPlugin(): Plugin {
    return {
        name: 'css-inject-iife',
        async generateBundle(_options, bundle) {
            // Find CSS and JS files in the bundle
            let cssContent = '';
            let jsFileName = '';
            let cssFileName = '';

            for (const fileName in bundle) {
                const chunk = bundle[fileName];
                if (chunk.type === 'asset' && fileName.endsWith('.css')) {
                    cssContent = chunk.source as string;
                    cssFileName = fileName;
                } else if (chunk.type === 'chunk' && fileName.endsWith('.js')) {
                    jsFileName = fileName;
                }
            }

            // If we have both CSS and JS, inject CSS into JS
            if (cssContent && jsFileName && bundle[jsFileName].type === 'chunk') {
                const jsChunk = bundle[jsFileName] as any;

                // Create CSS injection code
                const cssInjectionCode = `
// Inject CSS
if (typeof document !== "undefined") {
    const style = document.createElement("style");
    style.textContent = ${JSON.stringify(cssContent)};
    document.head.appendChild(style);
}

`;

                // Insert CSS injection at the beginning of the IIFE, after "use strict"
                const originalCode = jsChunk.code;
                jsChunk.code = jsChunk.code.replace(
                    /(function\(\)\s*{\s*"use strict";\s*)/,
                    `$1${cssInjectionCode}`
                );

                if (originalCode === jsChunk.code) {
                    // Try alternative pattern
                    jsChunk.code = jsChunk.code.replace(
                        /(\(function\(\)\s*{\s*"use strict";\s*)/,
                        `$1${cssInjectionCode}`
                    );
                }

                // Remove the CSS file from bundle since it's now inlined
                if (cssFileName) {
                    delete bundle[cssFileName];
                }
            }
        },
        async writeBundle(options, _bundle) {
            // Alternative approach: read CSS file after it's written and update JS file
            const fs = await import('fs');
            const path = await import('path');

            if (!options.dir) return;

            const cssFilePath = path.resolve(options.dir, 'json-ld-structured-data.css');
            const jsFilePath = path.resolve(options.dir, 'client.js');

            try {
                if (fs.existsSync(cssFilePath) && fs.existsSync(jsFilePath)) {
                    const cssContent = fs.readFileSync(cssFilePath, 'utf-8');
                    let jsContent = fs.readFileSync(jsFilePath, 'utf-8');

                    // Create CSS injection code
                    const cssInjectionCode = `
// Inject CSS
if (typeof document !== "undefined") {
    const style = document.createElement("style");
    style.textContent = ${JSON.stringify(cssContent)};
    document.head.appendChild(style);
}

`;

                    // Insert CSS injection at the beginning of the IIFE, after "use strict"
                    const originalCode = jsContent;
                    jsContent = jsContent.replace(
                        /(function\(\)\s*{\s*"use strict";\s*)/,
                        `$1${cssInjectionCode}`
                    );

                    if (originalCode === jsContent) {
                        // Try alternative pattern
                        jsContent = jsContent.replace(
                            /(\(function\(\)\s*{\s*"use strict";\s*)/,
                            `$1${cssInjectionCode}`
                        );
                    }

                    if (originalCode !== jsContent) {
                        fs.writeFileSync(jsFilePath, jsContent);
                        fs.unlinkSync(cssFilePath);
                    }
                }
            } catch (error) {
                // Silently handle errors - CSS might already be processed
            }
        }
    };
}

/**
 * Creates a plugin that injects the actual version from package.json
 */
function createVersionInjectionPlugin(pluginEntryPath: string, version: string): Plugin {
    const normalizedEntry = resolve(pluginEntryPath);
    return {
        name: 'version-inject',
        transform(code: string, id: string) {
            if (resolve(id) === normalizedEntry) {
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
            return defineConfig({
                ...baseConfig,
                plugins: [createCssInjectionPlugin(), wrapIifePlugin],
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