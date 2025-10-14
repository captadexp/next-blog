import {defineConfig} from 'vite';
import path, {resolve} from 'path';
import dts from 'vite-plugin-dts';
import fs from 'fs';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    build: {
        lib: {
            entry: {
                'runtime': resolve(__dirname, 'src/runtime.ts'),
                'preact': resolve(__dirname, 'src/preact.ts'),
                'jsx-runtime': resolve(__dirname, 'src/jsx-runtime.ts'),
                'jsx-dev-runtime': resolve(__dirname, 'src/jsx-dev-runtime.ts')
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
            exclude: ['src/global.d.ts'],
            rollupTypes: false,
            afterBuild: () => {
                // Copy global.d.ts
                const globalSrcPath = path.resolve(__dirname, 'src/global.d.ts');
                const globalDestPath = path.resolve(__dirname, 'dist/global.d.ts');
                if (fs.existsSync(globalSrcPath)) {
                    fs.copyFileSync(globalSrcPath, globalDestPath);
                }

                // Helper: ensure the reference is at the top of a .d.ts file
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
                    'dist/runtime.d.ts',
                    'dist/jsx-runtime.d.ts',
                    'dist/jsx-dev-runtime.d.ts',
                ]
                    .map((p) => path.resolve(__dirname, p))
                    .forEach(ensureReference);
            }

        })
    ]
});