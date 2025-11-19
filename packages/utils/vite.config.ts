import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: {
                index: resolve(__dirname, 'src/index.ts'),
                server: resolve(__dirname, 'src/server.ts'),
                client: resolve(__dirname, 'src/client.ts'),
                "content-transformers/index": resolve(__dirname, 'src/content-transformers/index.ts')
            },
            name: 'SupergrowthAIUtils',
            formats: ['es', 'cjs'],
            fileName: (format, entryName) => {
                const ext = format === 'es' ? 'mjs' : 'js';
                return `${entryName}.${ext}`;
            }
        },
        rollupOptions: {
            external: [
                // External libraries
                '@aws-sdk/client-s3',
                '@aws-sdk/lib-storage',
                'axios',
                'geolite2',
                'maxmind',
                'google-auth-library',
                'googleapis',
                'form-data',
                'yaml',
                'jsdom',
                'metadata-scraper',
                'really-relaxed-json',
                'tldts',
                'wink-eng-lite-web-model',
                'wink-nlp',
                '@getbrevo/brevo',
                'memoose-js',

                // Content transformer dependencies
                '@supergrowthai/next-blog-types',
                'htmlparser2',
                'domhandler',
                'dom-serializer',
                '@editorjs/editorjs',

                // Node.js builtin modules
                'fs',
                'fs/promises',
                'crypto',
                'path',
                'url',
                'events',
                'process',
                /^node:/
            ],
            output: {
                preserveModules: false,
                exports: 'named'
            }
        },
        emptyOutDir: true,
        minify: false,
        sourcemap: true
    },
    plugins: [
        dts({
            include: ['src/**/*.ts'],
            outDir: 'dist',
            rollupTypes: false,
            copyDtsFiles: true,
            insertTypesEntry: true,
            declarationOnly: false,
        })
    ]
});