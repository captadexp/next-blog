import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';
import * as path from 'path';
import {viteStaticCopy} from "vite-plugin-static-copy";
import fs from "fs";

export default defineConfig({
    build: {
        lib: {
            entry: {
                'index': path.resolve(__dirname, 'src/index.ts'),
                'client/index': path.resolve(__dirname, 'src/client/index.ts'),
                'server/index': path.resolve(__dirname, 'src/server/index.ts'),
                'build/index': path.resolve(__dirname, 'src/build/index.ts'),
                'content/index': path.resolve(__dirname, 'src/content/index.ts'),
                'jsx-runtime': path.resolve(__dirname, 'src/jsx-runtime.ts'),
                'jsx-dev-runtime': path.resolve(__dirname, 'src/jsx-dev-runtime.ts'),
            },
            fileName: (format, entryName) => `${entryName}.js`,
            formats: ['es'],
        },
        rollupOptions: {
            external: [
                // External libraries
                '@vitejs/plugin-react',
                '@tailwindcss/vite',
                'chalk',
                'commander',
                'esbuild',
                'glob',
                'postcss',
                'react',
                'react-dom',
                'tailwindcss',
                'vite',

                // Node.js builtin modules
                'fs',
                'path',
                'url',
                'child_process',
                'crypto',

                // Node.js specific imports
                /^node:.*/
            ],
        },
        outDir: 'dist',
        emptyOutDir: false,
        sourcemap: true,
        minify: false,
    },
    plugins: [
        dts({
            outDir: "dist",
            include: ['src'],
            rollupTypes: false,
            insertTypesEntry: true,
            afterBuild: () => {
                const ensureReference = (absPath: string) => {
                    if (!fs.existsSync(absPath)) return;
                    const content = fs.readFileSync(absPath, 'utf-8');

                    // Skip if already present (be tolerant of whitespace)
                    if (/^\s*\/\/\/\s*<reference\s+path="\.\/*global\.d\.ts"\s*\/>/m.test(content)) return;

                    fs.writeFileSync(
                        absPath,
                        `/// <reference path="./global.d.ts" />\n\n${content}`
                    );
                };

                // Add reference to the usual runtime entry .d.ts files
                [
                    'dist/jsx-runtime.d.ts',
                    'dist/jsx-dev-runtime.d.ts',
                ]
                    .map((p) => path.resolve(__dirname, p))
                    .forEach(ensureReference);
            }
        }),
        dts({
            outDir: "dist/types-rolled-up",
            include: ['src'],
            rollupTypes: true,
            bundledPackages: ["@supergrowthai/types", "@supergrowthai/jsx-runtime", "@supergrowthai/oneapi"],
            afterBuild: () => {
                const ensureReference = (absPath: string) => {
                    if (!fs.existsSync(absPath)) return;
                    const content = fs.readFileSync(absPath, 'utf-8');

                    // Skip if already present (be tolerant of whitespace)
                    if (/^\s*\/\/\/\s*<reference\s+path="\.\/*global\.d\.ts"\s*\/>/m.test(content)) return;

                    fs.writeFileSync(
                        absPath,
                        `/// <reference path="./global.d.ts" />\n\n${content}`
                    );
                };

                // Add reference to the usual runtime entry .d.ts files
                [
                    'dist/jsx-runtime.d.ts',
                    'dist/jsx-dev-runtime.d.ts',
                ]
                    .map((p) => path.resolve(__dirname, p))
                    .forEach(ensureReference);
            }
        }),
        viteStaticCopy({
            targets: [
                {
                    src: path.resolve(__dirname, './../jsx-runtime/dist/global.d.ts'),
                    dest: './',
                }
            ],
        }),
    ],
});