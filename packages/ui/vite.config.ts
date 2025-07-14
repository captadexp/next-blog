import {defineConfig} from 'vite';
import {resolve} from 'path';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react'

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.tsx'),
            name: 'NextBlogUI',
            fileName: 'index',
            formats: ['es'],
        },
        rollupOptions: {
            external: ['react', 'react-dom', '@supergrowthai/next-blog'],
        },
        sourcemap: true,
        emptyOutDir: true,
    },
    plugins: [
        react(),
        dts(),
    ],
});
