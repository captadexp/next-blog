import {defineConfig} from 'vite';
import {resolve} from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: {
                'index': resolve(__dirname, 'src/index.ts'),
                'express': resolve(__dirname, 'src/expressjs.ts'),
                'nextjs': resolve(__dirname, 'src/nextjs.ts')
            },
            fileName: (format, entryName) => `${entryName}.js`,
            formats: ['es'],
        },
        rollupOptions: {
            external: ['next', 'express', 'iron-session', /^node:/, /^next\/.*/],
        },
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        minify: false,
    },
    plugins: [
        dts({
            rollupTypes: true,
            outDir: 'dist',
            include: ['src'],
        }),
    ],
});
