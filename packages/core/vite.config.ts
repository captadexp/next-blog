import dts from "vite-plugin-dts";
import {defineConfig} from "vite";

import * as path from "path";
import tailwindcss from "@tailwindcss/vite";
import {viteStaticCopy} from 'vite-plugin-static-copy';

export default defineConfig(({mode}) => {

    return {
        build: {
            lib: {
                entry: {
                    index: path.resolve(__dirname, 'src/index.ts'),
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

                    // Node.js builtin modules
                    'fs',
                    'fs/promises',
                    'crypto',
                    'path',
                    'url',
                    'events',
                    'process',

                    // Node: prefixed modules
                    'node:fs',
                    'node:fs/promises',
                    'node:crypto',
                    'node:path',
                    'node:events',
                    'node:process',

                    // Next.js specific imports
                    /^next\/.*/
                ]
            },
            outDir: 'dist',
            emptyOutDir: false,
            sourcemap: true,
            minify: false,
        },
        plugins: [
            tailwindcss(),
            dts({
                outDir: 'dist',
                include: ['src'],
                exclude: ['node_modules', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
                rollupTypes: false,
            }),
            viteStaticCopy({
                targets: [
                    {
                        src: path.resolve(__dirname, './../dashboard/dist/static/'),
                        dest: 'assets/@supergrowthai/next-blog-dashboard',
                    }
                ],
            }),
        ]
    }
})