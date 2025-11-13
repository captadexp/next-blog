import {defineConfig} from 'vite';
import {resolve} from 'path';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react'
import {libInjectCss} from 'vite-plugin-lib-inject-css';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.tsx'),
            name: 'NextBlogUI',
            fileName: (format, entryName) => `${entryName}.js`,
            formats: ['es'],
        },
        rollupOptions: {
            external: [
                /^react($|\/)/,
                /^react-dom($|\/)/,
                /^@supergrowthai\/next-blog.*/
            ],
        },
        sourcemap: true,
        emptyOutDir: false,
    },
    plugins: [
        react(),
        libInjectCss(),
        dts({
            insertTypesEntry: true,
            copyDtsFiles: true,
        }),
    ],
});
