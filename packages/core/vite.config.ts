import dts from "vite-plugin-dts";
import {defineConfig, PluginOption} from "vite";

import * as path from "path";
import tailwindcss from "@tailwindcss/vite";
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

// Embed all dashboard static assets as strings at build time.
// This eliminates runtime filesystem reads — the same pattern next-auth uses
// for CSS (import css from "./styles.js"). All JS/CSS/JSON/SVG files from
// dashboard/dist/static/ are embedded; .map files are skipped (debug-only).
const EMBEDDABLE_EXTENSIONS = new Set(['.js', '.css', '.json', '.svg']);

function dashboardAssetsEmbedPlugin(): PluginOption {
    const generate = () => {
        const staticDir = path.resolve(__dirname, '../dashboard/dist/static');
        const outputFile = path.resolve(__dirname, 'src/generated/dashboardStaticAssets.ts');
        const entries: Record<string, string> = {};

        if (existsSync(staticDir)) {
            // Recursively walk the static directory
            const walk = (dir: string, prefix: string) => {
                for (const entry of readdirSync(dir, {withFileTypes: true})) {
                    const fullPath = path.join(dir, entry.name);
                    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

                    if (entry.isDirectory()) {
                        walk(fullPath, relativePath);
                    } else if (EMBEDDABLE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
                        entries[relativePath] = readFileSync(fullPath, 'utf-8');
                    }
                }
            };
            walk(staticDir, '');
        }

        const content = `// Auto-generated — do not edit. Regenerated on every build.
// All dashboard static assets embedded as strings (next-auth pattern).
export const DASHBOARD_STATIC_ASSETS: Record<string, string> = ${JSON.stringify(entries, null, 2)};
`;
        mkdirSync(path.dirname(outputFile), {recursive: true});
        writeFileSync(outputFile, content);
        const totalKB = Math.round(Object.values(entries).reduce((sum, v) => sum + v.length, 0) / 1024);
        console.log(`dashboard static assets embedded (${Object.keys(entries).length} files, ${totalKB}KB)`);
    };

    generate();

    return {
        name: 'dashboard-assets-embed',
        buildStart() {
            generate();
        }
    };
}

export default defineConfig(({mode}) => {
    const isWatchMode = process.argv.includes('--watch') || process.argv.includes('-w');
    const filesToIgnoreInWatch = isWatchMode ? {
        watch: {exclude: ['src/version.ts', 'src/generated/dashboardStaticAssets.ts']}
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
            dashboardAssetsEmbedPlugin(),
            tailwindcss(),
            dts({
                outDir: "dist",
                include: ["src"],
                bundledPackages: ["@supergrowthai/next-blog-types", "@supergrowthai/next-blog-dashboard"],
                rollupTypes: false
            }),
        ]
    }
})