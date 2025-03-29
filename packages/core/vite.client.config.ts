import {defineConfig} from "vite";
import * as path from "path";

export default defineConfig({
    build: {
        outDir: 'dist/static',
        emptyOutDir: false,
        rollupOptions: {
            input: {
                'dashboard': path.resolve(__dirname, 'src/client/dashboard/index.tsx'),
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name]-[hash].js',
                assetFileNames: '[name]-[hash][extname]',
            },
        },
    },
    resolve: {
        alias: {
            'react': 'preact/compat',
            'react-dom': 'preact/compat',
            'react/jsx-runtime': 'preact/jsx-runtime',
        },
    },
});