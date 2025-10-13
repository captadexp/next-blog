import {defineConfig} from 'vite';
import {resolve} from 'path';
import dts from 'vite-plugin-dts';
import tailwindcss from "@tailwindcss/vite";
import cssInjectedByJs from 'vite-plugin-css-injected-by-js';
import {viteStaticCopy} from 'vite-plugin-static-copy';

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
            rollupTypes: true
        }),
        viteStaticCopy({
            targets: [
                {
                    src: resolve(__dirname, '../jsx-runtime/dist/runtime.umd.js'),
                    dest: 'static',
                    rename: 'plugin-runtime.js'
                }
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