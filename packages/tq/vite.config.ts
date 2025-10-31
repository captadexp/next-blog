import {defineConfig} from 'vite';
import {resolve} from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        target: 'node18',
        lib: {
            entry: {
                index: resolve(__dirname, 'src/index.ts'),
                'types': resolve(__dirname, 'src/types.ts'),
                'core/base/interfaces': resolve(__dirname, 'src/core/base/interfaces.ts'),
            },
            name: 'SupergrowthAITQ',
            formats: ['es', 'cjs'],
            fileName: (format, entryName) => {
                const ext = format === 'es' ? 'mjs' : 'js';
                return `${entryName}.${ext}`;
            }
        },
        rollupOptions: {
            external: [
                // External libraries
                'lodash',
                'mongodb',
                'moment',
                'bson',

                // Workspace dependencies
                '@supergrowthai/mq',
                "memoose-js",
                "ioredis",

                // Node.js builtin modules
                'fs',
                'fs/promises',
                'crypto',
                'path',
                'url',
                'events',
                'process',
                /^node:/
            ],
            output: {
                preserveModules: false,
                exports: 'named'
            }
        },
        emptyOutDir: true,
        minify: false,
        sourcemap: true
    },
    plugins: [
        dts({
            include: ['src/**/*.ts'],
            outDir: 'dist',
            rollupTypes: false,
            copyDtsFiles: true,
            insertTypesEntry: true,
            declarationOnly: false,
        })
    ]
});