import {defineConfig} from 'vite';
import {resolve} from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: {
                'runtime': resolve(__dirname, 'src/runtime.ts'),
                'preact': resolve(__dirname, 'src/preact.ts'),
                'jsx-runtime': resolve(__dirname, 'src/jsx-runtime.ts'),
                'jsx-dev-runtime': resolve(__dirname, 'src/jsx-dev-runtime.ts'),
                'plugin-components': resolve(__dirname, 'src/plugin-components.ts')
            },
            formats: ['es'],
            fileName: (format, entryName) => `${entryName}.js`
        },
        rollupOptions: {
            output: {
                exports: 'named'
            }
        },
        outDir: 'dist',
        emptyOutDir: false,
        minify: true,
        sourcemap: true
    },
    plugins: [
        dts({
            outDir: 'dist',
            include: ['src'],
            rollupTypes: false
        })
    ]
});