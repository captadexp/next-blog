import {defineConfig} from 'vite';
import {resolve} from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        target: 'node18',
        lib: {
            entry: {
                index: resolve(__dirname, 'src/index.ts'),
                'core/index': resolve(__dirname, 'src/core/index.ts'),
                'core/types': resolve(__dirname, 'src/core/types.ts'),
                'core/utils': resolve(__dirname, 'src/core/utils.ts'),
                'queues/index': resolve(__dirname, 'src/queues/index.ts'),
                'shard/index': resolve(__dirname, 'src/shard/index.ts'),
            },
            name: 'SupergrowthAIMQ',
            formats: ['es', 'cjs'],
            fileName: (format, entryName) => {
                const ext = format === 'es' ? 'mjs' : 'js';
                return `${entryName}.${ext}`;
            }
        },
        rollupOptions: {
            external: [
                // External libraries
                'ioredis',
                'memoose-js',
                'mongodb',
                'moment',
                'bson',
                '@aws-sdk/client-kinesis',

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
            bundledPackages: ["@supergrowthai/utils"],
            rollupTypes: false,
            copyDtsFiles: true,
            insertTypesEntry: true,
            declarationOnly: false,
        })
    ]
});