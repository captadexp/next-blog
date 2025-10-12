import {build, createServer, defineConfig, type InlineConfig} from 'vite';
import {createViteConfig} from './vite-config.js';
import {existsSync, readFileSync, writeFileSync} from 'fs';
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';
import type {PluginBuildOptions, PluginDevOptions, PluginWatchOptions} from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function createEnvDtsFile(root: string) {
    const templatePath = join(__dirname, '../../templates/plugin-env.d.ts');
    const envPath = join(root, 'plugin-env.d.ts');

    if (existsSync(templatePath)) {
        const content = readFileSync(templatePath, 'utf-8');
        writeFileSync(envPath, content, 'utf-8');
        console.log('✨ Created plugin-env.d.ts');
    }
}

export async function buildPlugin(options: PluginBuildOptions) {
    const {root = process.cwd(), outDir = 'dist'} = options;

    // Create plugin-env.d.ts file
    createEnvDtsFile(root);

    // Check for both .ts and .tsx extensions for client entry only
    const clientEntryTs = join(root, 'src', 'client.ts');
    const clientEntryTsx = join(root, 'src', 'client.tsx');
    const clientEntry = existsSync(clientEntryTsx) ? 'client.tsx' : (existsSync(clientEntryTs) ? 'client.ts' : 'client.tsx');

    const entryPoints = {
        plugin: 'index.ts',  // Always .ts
        client: clientEntry,  // Can be .ts or .tsx
        server: 'server.ts',  // Always .ts
    };

    const builds = [];

    for (const [type, entry] of Object.entries(entryPoints)) {
        const entryPath = join(root, 'src', entry);

        if (!existsSync(entryPath) && type !== 'plugin') {
            console.log(`⏩ Skipping ${type} build (${entry} not found)`);
            continue;
        }

        if (!existsSync(entryPath) && type === 'plugin') {
            throw new Error(`Plugin manifest entry point not found: src/${entry}`);
        }

        const config = await createViteConfig({
            root,
            entry: entryPath,
            outDir,
            type: type as 'plugin' | 'client' | 'server',
            mode: 'production',
        });

        console.log(`📦 Building ${type}...`);
        builds.push(build(config));
    }

    await Promise.all(builds);
}

export async function watchPlugin(options: PluginWatchOptions) {
    const {root = process.cwd(), outDir = 'dist'} = options;

    // Create plugin-env.d.ts file
    createEnvDtsFile(root);

    // Check for both .ts and .tsx extensions for client entry only
    const clientEntryTs = join(root, 'src', 'client.ts');
    const clientEntryTsx = join(root, 'src', 'client.tsx');
    const clientEntry = existsSync(clientEntryTsx) ? 'client.tsx' : (existsSync(clientEntryTs) ? 'client.ts' : 'client.tsx');

    const entryPoints = {
        plugin: 'index.ts',  // Always .ts
        client: clientEntry,  // Can be .ts or .tsx
        server: 'server.ts',  // Always .ts
    };

    const watchers = [];

    for (const [type, entry] of Object.entries(entryPoints)) {
        const entryPath = join(root, 'src', entry);

        if (!existsSync(entryPath) && type !== 'plugin') {
            continue;
        }

        if (!existsSync(entryPath) && type === 'plugin') {
            throw new Error(`Plugin manifest entry point not found: src/${entry}`);
        }

        const config = await createViteConfig({
            root,
            entry: entryPath,
            outDir,
            type: type as 'plugin' | 'client' | 'server',
            mode: 'development',
            watch: true,
        });

        console.log(`👀 Watching ${type}...`);
        watchers.push(build(config));
    }

    const watchPromises = watchers.map(async (watchPromise) => {
        const watcher = await watchPromise;
        return watcher;
    });

    await Promise.all(watchPromises);
}

export async function devServer(options: PluginDevOptions) {
    const {root = process.cwd(), port = 3001} = options;

    // Create plugin-env.d.ts file
    createEnvDtsFile(root);

    // Set the dev server URL in environment for the build to use
    process.env.PLUGIN_BASE_URL = `http://localhost:${port}`;

    // Start watching and building files
    console.log('📦 Starting watch mode...');

    // Run watchPlugin in the background (non-blocking)
    watchPlugin({root, outDir: 'dist'}).catch(error => {
        console.error('❌ Watch process failed:', error);
        process.exit(1);
    });

    // Give the watcher a moment to create initial builds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create a simple static server for the dist directory
    const config = defineConfig({
        root: join(root, 'dist'),
        server: {
            port,
            open: false,
        },
        build: {
            // Disable building in dev server
            rollupOptions: {
                input: []
            }
        }
    });

    const server = await createServer(config as InlineConfig);
    await server.listen();

    console.log(`\n🚀 Dev server running at http://localhost:${port}`);
    console.log(`📁 Serving: ${join(root, 'dist')}`);
    console.log(`👀 Watching for file changes...`);
    console.log(`\nFiles available at:`);
    console.log(`  - http://localhost:${port}/plugin.js`);
    console.log(`  - http://localhost:${port}/client.js`);
    console.log(`  - http://localhost:${port}/server.js\n`);
}

export * from './vite-config.js';
export * from './types.js';