import {defineConfig, normalizePath} from 'vite';
import {resolve} from 'path';
import dts from 'vite-plugin-dts';
import tailwindcss from "@tailwindcss/vite";
import cssInjectedByJs from 'vite-plugin-css-injected-by-js';
import {Target, viteStaticCopy} from 'vite-plugin-static-copy';
import * as fs from 'fs';
import path from 'node:path'

function generateInternalPluginSourcePaths() {
    const internalPluginsDir = resolve(__dirname, '../../plugins/internal');
    const targets: Target[] = [];

    if (fs.existsSync(internalPluginsDir)) {
        const plugins = fs.readdirSync(internalPluginsDir, {withFileTypes: true})
            .filter(dirent => dirent.isDirectory());

        for (const plugin of plugins) {
            const distPath = resolve(internalPluginsDir, plugin.name, 'dist');
            if (fs.existsSync(distPath)) {
                targets.push({
                    src: normalizePath(path.resolve(`${distPath}/**/*`)),
                    dest: normalizePath(path.resolve(`dist/static/internal-plugins/${plugin.name}`))
                });
            }
        }
    }

    return targets;
}

export default defineConfig({
    base: "/static/",
    publicDir: "public",
    build: {
        lib: {
            entry: {
                'index': resolve(__dirname, 'src/index.ts'),
                'static/dashboard': resolve(__dirname, 'src/dashboard/index.tsx'),
            },
            formats: ['es']
        },
        rollupOptions: {
            external: [],
            output: {
                assetFileNames: 'static/[name].[ext]',
                chunkFileNames: 'static/[name]-[hash].js',
                entryFileNames: '[name].js'
            }
        },
        copyPublicDir: true,
        cssCodeSplit: false,
        outDir: "dist",
        emptyOutDir: false,
        sourcemap: true,
        minify: false,
    },
    plugins: [
        tailwindcss(),
        cssInjectedByJs(),
        dts({
            outDir: "dist",
            include: ['src'],
            rollupTypes: false
        }),
        viteStaticCopy({
            targets: [
                {
                    src: normalizePath(path.resolve(__dirname, '../jsx-runtime/dist/runtime.umd.js')),
                    dest: 'static',
                    rename: 'plugin-runtime.js'
                },
                ...generateInternalPluginSourcePaths()
            ]
        }),
    ],
    resolve: {
        alias: {
            'react': 'preact/compat',
            'react-dom': 'preact/compat',
            'react/jsx-runtime': 'preact/jsx-runtime',
        },
    },
});