import {defineConfig} from 'vite';
import {resolve} from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: {
                index: resolve(__dirname, 'src/index.ts'),
                server: resolve(__dirname, 'src/server.ts'),
                client: resolve(__dirname, 'src/client.ts'),
                'plugin/client': resolve(__dirname, 'src/plugin/client.ts'),
                'plugin/server': resolve(__dirname, 'src/plugin/server.ts'),
                'plugin/manifest': resolve(__dirname, 'src/plugin/manifest.ts'),
                'sdk/client': resolve(__dirname, 'src/sdk/client.ts'),
                'sdk/server': resolve(__dirname, 'src/sdk/server.ts'),
                'database/entities': resolve(__dirname, 'src/database/entities.ts'),
                'database/adapter': resolve(__dirname, 'src/database/adapter.ts')
            },
            name: 'SupergrowthAITypes',
            formats: ['es', 'cjs'],
            fileName: (format, entryName) => {
                const ext = format === 'es' ? 'mjs' : 'js';
                return `${entryName}.${ext}`;
            }
        },
        rollupOptions: {
            external: [/^node:/],
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