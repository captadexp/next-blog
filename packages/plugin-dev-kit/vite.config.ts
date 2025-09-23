import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';
import * as path from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: {
                index: path.resolve(__dirname, 'src/index.ts'),
                'client/index': path.resolve(__dirname, 'src/client/index.ts'),
                'server/index': path.resolve(__dirname, 'src/server/index.ts'),
                'build/index': path.resolve(__dirname, 'src/build/index.ts'),
            },
            fileName: (format, entryName) => `${entryName}.js`,
            formats: ['es'],
        },
        rollupOptions: {
            external: [
                // Workspace dependencies
                '@supergrowthai/jsx-runtime',
                '@supergrowthai/types',

                // External libraries
                '@vitejs/plugin-react',
                'chalk',
                'commander',
                'esbuild',
                'glob',
                'react',
                'react-dom',
                'vite',

                // Node.js builtin modules
                'fs',
                'path',
                'url',
                'child_process',
                'crypto',

                // Node.js specific imports
                /^node:.*/
            ],
        },
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        minify: false,
    },
    plugins: [
        dts({
            outDir: 'dist',
            include: ['src'],
            exclude: ['node_modules', 'templates'],
            rollupTypes: false,
            copyDtsFiles: true,
            insertTypesEntry: true,
            declarationOnly: false,
        }),
    ],
});