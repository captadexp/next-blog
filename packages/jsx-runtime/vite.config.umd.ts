import {defineConfig} from 'vite';
import {resolve} from 'path';

// Separate config for UMD build of runtime only
export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/runtime.ts'),
            name: 'PluginRuntime',
            formats: ['umd'],
            fileName: () => 'runtime.umd.js'
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
    }
});