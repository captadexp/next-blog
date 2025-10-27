import {defineConfig} from 'vite';
import {resolve} from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: {
                index: resolve(__dirname, 'src/index.ts'),
                'queues/IMessageQueue': resolve(__dirname, 'src/queues/IMessageQueue.ts'),
                'types': resolve(__dirname, 'src/types.ts'),
                'utils': resolve(__dirname, 'src/utils.ts'),
                'adapters/index': resolve(__dirname, 'src/adapters/index.ts'),
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

                // Workspace dependencies (will be removed for npm publishing)
                '@supergrowthai/cache',

                // Node.js builtin modules
                'fs',
                'fs/promises',
                'crypto',
                'path',
                'url',
                'events',
                'process',
                'node:*'
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