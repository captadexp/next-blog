import dts from "vite-plugin-dts";
import {defineConfig} from "vite";

import * as path from "path";


export default defineConfig(({mode}) => {

    return {
        ssr: {noExternal: true},
        build: {
            lib: {
                entry: {
                    index: path.resolve(__dirname, 'src/index.tsx'),
                    'ui/index': path.resolve(__dirname, 'src/ui/index.tsx'),
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
                    // Node.js builtin modules
                    'fs',
                    'crypto',
                    'path',

                    // Next.js specific imports
                    /^next\/.*/
                ],
                output: {
                    entryFileNames({name}) {
                        return `${name}.js`;
                    },
                },
            },
            outDir: 'dist/core',
            emptyOutDir: true,
            target: 'node18',
            sourcemap: true,
            minify: false,
        },
        plugins: [
            dts({
                outDir: 'dist/core',
                include: ['src'],
                exclude: ['node_modules', 'src/**/*.test.ts', 'src/**/*.spec.ts', 'src/client/**/*'],
                rollupTypes: false,
            }),
        ],
        resolve: {
            alias: {
                'react': 'preact/compat',
                'react-dom': 'preact/compat',
                'react/jsx-runtime': 'preact/jsx-runtime',
            },
        },
    }
})