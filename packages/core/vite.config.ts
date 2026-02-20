import dts from "vite-plugin-dts";
import {defineConfig, normalizePath, PluginOption} from "vite";

import * as path from "path";
import tailwindcss from "@tailwindcss/vite";
import {viteStaticCopy} from 'vite-plugin-static-copy';
import {readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync} from 'fs';

// Custom plugin to generate version file
function versionPlugin(): PluginOption {
    // Helper function to generate the version file
    const generateVersionFile = () => {
        // Read version from package.json
        const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
        const version = packageJson.version;

        // Create version info object
        const versionInfo = {
            version,
            buildTime: new Date().toISOString(),
            buildMode: process.env.NODE_ENV || 'development'
        };

        // Write version file to src for inclusion in build
        const versionFilePath = path.resolve(__dirname, 'src/version.ts');
        const versionFileContent = `// Auto-generated file - do not edit manually
export const VERSION_INFO = ${JSON.stringify(versionInfo, null, 2)} as const;
`;
        writeFileSync(versionFilePath, versionFileContent);
        console.log("version file generated");
    };

    // Generate immediately when plugin is created
    generateVersionFile();

    return {
        name: 'version-generator',
        buildStart() {
            // Regenerate during builds to update buildTime
            generateVersionFile();
        }
    };
}

// Custom plugin to embed internal plugin files as strings
function internalPluginsEmbedPlugin(): PluginOption {
    const generate = () => {
        const pluginsDir = path.resolve(__dirname, '../dashboard/dist/static/internal-plugins');
        const outputFile = path.resolve(__dirname, 'src/generated/internalPluginAssets.ts');
        const entries: Record<string, string> = {};

        if (existsSync(pluginsDir)) {
            const pluginDirs = readdirSync(pluginsDir, {withFileTypes: true})
                .filter(d => d.isDirectory());

            for (const dir of pluginDirs) {
                const pluginPath = path.join(pluginsDir, dir.name);
                const files = readdirSync(pluginPath).filter(f => f.endsWith('.js'));

                for (const file of files) {
                    const key = `internal-plugins/${dir.name}/${file}`;
                    const content = readFileSync(path.join(pluginPath, file), 'utf-8');
                    entries[key] = content;
                }
            }
        }

        const content = `// Auto-generated file - do not edit manually
// Contains internal plugin files embedded as strings
export const INTERNAL_PLUGIN_ASSETS: Record<string, string> = ${JSON.stringify(entries, null, 2)};
`;
        mkdirSync(path.dirname(outputFile), { recursive: true });
        writeFileSync(outputFile, content);
        console.log(`internal plugin assets embedded (${Object.keys(entries).length} files)`);
    };

    generate();

    return {
        name: 'internal-plugins-embed',
        buildStart() {
            generate();
        }
    };
}

export default defineConfig(({mode}) => {
    const isWatchMode = process.argv.includes('--watch') || process.argv.includes('-w');
    const filesToIgnoreInWatch = isWatchMode ? {
        watch: {exclude: ['src/version.ts', 'src/generated/internalPluginAssets.ts']}
    } : {};

    return {
        build: {
            target: 'node18',
            ...filesToIgnoreInWatch,
            lib: {
                entry: {
                    'index': path.resolve(__dirname, 'src/index.ts'),
                    'adapters/index': path.resolve(__dirname, 'src/adapters/index.ts'),
                    'nextjs/index': path.resolve(__dirname, 'src/nextjs/index.ts'),
                },
                fileName: (format, entryName) => `${entryName}.js`,
                formats: ["es"],
            },
            rollupOptions: {
                external: [
                    // External libraries
                    'next',
                    'next/server',
                    'mongodb',
                    'sift',
                    'uuid',
                    "fast-xml-parser",
                    "@aws-sdk/client-s3",
                    "@aws-sdk/lib-storage",
                    "@xmldom/xmldom",
                    "memoose-js",

                    // Node.js builtin modules
                    'fs',
                    'fs/promises',
                    'crypto',
                    'path',
                    'url',
                    'events',
                    'process',

                    // Node: prefixed modules
                    'node:fs',
                    'node:fs/promises',
                    'node:crypto',
                    'node:path',
                    'node:events',
                    'node:process',

                    // Next.js specific imports
                    /^next\/.*/
                ]
            },
            outDir: 'dist',
            emptyOutDir: false,
            sourcemap: true,
            minify: false,
        },
        plugins: [
            versionPlugin(),
            internalPluginsEmbedPlugin(),
            tailwindcss(),
            dts({
                outDir: "dist",
                include: ["src"],
                bundledPackages: ["@supergrowthai/next-blog-types", "@supergrowthai/next-blog-dashboard"],
                rollupTypes: false
            }),
            viteStaticCopy({
                targets: [
                    {
                        src: normalizePath(path.resolve(__dirname, './../dashboard/dist/static/')),
                        dest: 'nextjs/assets/@supergrowthai/next-blog-dashboard',
                    }
                ],
            }),
        ]
    }
})