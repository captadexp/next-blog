import {defineConfig} from 'vite';
import {resolve} from 'path';
import dts from 'vite-plugin-dts';
import tailwindcss from "@tailwindcss/vite";
import cssInjectedByJs from 'vite-plugin-css-injected-by-js';

export default defineConfig({
    base: "/static/",
    publicDir: "public",
    build: {
        outDir: "dist",
        minify: false,
        cssCodeSplit: false, // Bundle CSS into a single file
        lib: {
            entry: {
                'server/index': resolve(__dirname, 'src/server/index.ts'),
                'static/dashboard': resolve(__dirname, 'src/dashboard/index.tsx'),
            },
            formats: ['es']
        },
        copyPublicDir: true,
        sourcemap: true,
        emptyOutDir: false,
        rollupOptions: {
            external: [],
            output: {
                assetFileNames: 'static/[name].[ext]',
                chunkFileNames: 'static/[name]-[hash].js',
                entryFileNames: '[name].js'
            }
        },
    },
    plugins: [
        dts({
            include: ['src'],
            exclude: ['node_modules'],
            rollupTypes: false,
        }),
        tailwindcss(),
        cssInjectedByJs()
    ],
    resolve: {
        alias: {
            'react': 'preact/compat',
            'react-dom': 'preact/compat',
            'react/jsx-runtime': 'preact/jsx-runtime',
        },
    },
});