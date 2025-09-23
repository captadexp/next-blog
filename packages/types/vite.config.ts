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
                common: resolve(__dirname, 'src/common.ts')
            },
            name: 'SupergrowthAITypes',
            formats: ['es', 'cjs'],
            fileName: (format, entryName) => {
                const ext = format === 'es' ? 'mjs' : 'js';
                return `${entryName}.${ext}`;
            }
        },
        rollupOptions: {
            external: ['node:*'],
            output: {
                preserveModules: false,
                exports: 'named'
            }
        },
        minify: false,
        sourcemap: true
    },
    plugins: [
        dts({
            include: ['src/**/*.ts'],
            outDir: 'dist',
            rollupTypes: true,
            insertTypesEntry: true
        })
    ]
});