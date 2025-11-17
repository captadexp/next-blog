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
                'types': resolve(__dirname, 'src/types.ts'),
                'adapters/index': resolve(__dirname, 'src/adapters/index.ts'),
                'core/base/interfaces': resolve(__dirname, 'src/core/base/interfaces.ts'),
                'core/Actions': resolve(__dirname, 'src/core/Actions.ts'),
                'core/async/AsyncActions': resolve(__dirname, 'src/core/async/AsyncActions.ts'),
                'core/async/AsyncTaskManager': resolve(__dirname, 'src/core/async/AsyncTaskManager.ts'),
                'utils/task-id-gen': resolve(__dirname, 'src/utils/task-id-gen.ts'),
            },
            name: 'SupergrowthAITQ',
            formats: ['es', 'cjs'],
            fileName: (format, entryName) => {
                const ext = format === 'es' ? 'mjs' : 'cjs';
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