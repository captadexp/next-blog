import dts from "vite-plugin-dts";
import {defineConfig} from "vite";

import * as path from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({mode}) => {

    return {
        build: {
            lib: {
                entry: {
                    index: path.resolve(__dirname, 'src/index.tsx'),
                    types: path.resolve(__dirname, 'src/types.ts'),
                    'adapters/index': path.resolve(__dirname, 'src/adapters/index.ts'),
                },
                fileName: (format, entryName) => `${entryName}.js`,
                formats: ["es"],
            },
            rollupOptions: {
                external: [
                    // External libraries
                    'next',
                    'next/server',
                    'mongodb',
                    'uuid',

                    '@supergrowthai/next-blog-dashboard',

                    // Node.js builtin modules
                    'fs',
                    'crypto',
                    'path',

                    // Next.js specific imports
                    /^next\/.*/
                ]
            },
            outDir: 'dist/core',
            emptyOutDir: false,
            target: 'node18',
            sourcemap: true,
            minify: false,
        },
        plugins: [
            tailwindcss(),
            dts({
                outDir: 'dist/core',
                include: ['src'],
                exclude: ['node_modules', 'src/**/*.test.ts', 'src/**/*.spec.ts', 'src/client/**/*'],
                rollupTypes: false,
            }),
        ]
    }
})