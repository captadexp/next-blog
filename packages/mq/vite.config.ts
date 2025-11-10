import {defineConfig} from 'vite';
import path, {resolve} from 'path';
import dts from 'vite-plugin-dts';
import fs from "fs";

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
                'queues/implementations/memory': resolve(__dirname, 'src/queues/implementations/memory.ts'),
                'queues/implementations/immediate': resolve(__dirname, 'src/queues/implementations/immediate.ts'),
                'queues/implementations/mongodb': resolve(__dirname, 'src/queues/implementations/mongodb.ts'),
                'queues/implementations/kinesis': resolve(__dirname, 'src/queues/implementations/kinesis.ts'),
                'shard/index': resolve(__dirname, 'src/shard/index.ts'),
                'shard/lock-providers/index': resolve(__dirname, 'src/shard/lock-providers/index.ts'),
                'shard/leaser/index': resolve(__dirname, 'src/shard/leaser/index.ts'),
            },
            name: 'SupergrowthAIMQ',
            formats: ['es', 'cjs'],
            fileName: (format, entryName) => {
                const ext = format === 'es' ? 'mjs' : 'cjs';
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
            afterBuild: (result) => {
                function processDirectory(dir) {
                    const entries = fs.readdirSync(dir, {withFileTypes: true});
                    for (const entry of entries) {
                        const fullPath = path.join(dir, entry.name);
                        if (entry.isDirectory()) {
                            processDirectory(fullPath);
                        } else if (entry.name.endsWith('.d.ts')) {
                            const ctsPath = fullPath.replace('.d.ts', '.d.cts');
                            const content = fs.readFileSync(fullPath, 'utf8');
                            fs.writeFileSync(ctsPath, content);
                        }
                    }
                }

                processDirectory(path.resolve(__dirname, 'dist'));
            }
        })
    ]
});