#!/usr/bin/env bun
import {execSync} from 'child_process';
import {cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'fs';
import {basename, join} from 'path';

interface PluginManifest {
    id: string;
    name: string;
    version: string;
    author?: string;
    description?: string;
    client?: { type: string; url: string };
    server?: { type: string; url: string };
}

interface ManifestEntry {
    id: string;
    name: string;
    version: string;
    author: string;
    description?: string;
    path: string;
    files: {
        client?: string;
        server?: string;
        plugin?: string;
    };
}

// Check for required environment variable
const PLUGIN_HOST_URL = process.env.PLUGIN_HOST_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);

if (!PLUGIN_HOST_URL) {
    console.error('❌ Error: PLUGIN_HOST_URL or VERCEL_PROJECT_PRODUCTION_URL environment variable must be set');
    console.error('Please set PLUGIN_HOST_URL to your deployment URL, e.g.:');
    console.error('  export PLUGIN_HOST_URL="https://next-blog.vercel.app"');
    console.error('Or deploy to Vercel production (main branch) for automatic URL detection');
    process.exit(1);
}

console.log('🚀 Building plugins for deployment...');
console.log(`📍 Using host URL: ${PLUGIN_HOST_URL}`);

const ROOT_DIR = join(import.meta.dir, '../..');
const PUBLIC_PLUGINS_DIR = join(import.meta.dir, 'public/plugins');

// Define plugin paths to build (relative to ROOT_DIR)
// These paths should contain a package.json file
const PLUGIN_PATHS = [
    // Top-level plugins
    'plugins/ai-blog-generator',
    'plugins/api-widget',
    'plugins/broken-link-checker',
    'plugins/test-plugin',

    // SEO plugins
    'plugins/seo/analyzer',
    'plugins/seo/json-ld-structured-data',
    'plugins/seo/llms',
    'plugins/seo/permalink-manager',
    'plugins/seo/robots',
    'plugins/seo/rss',
    'plugins/seo/sitemap',

    // Note: Internal plugins excluded
    // 'plugins/internal/system-update-manager',
    // 'plugins/internal/system',
];

// Optional: Map source paths to custom output paths
// If not specified, the source structure will be maintained
const PATH_MAPPINGS: Record<string, string> = {
    // Flatten SEO plugins to top level with prefixed names
    'plugins/seo/analyzer': 'seo-analyzer',
    'plugins/seo/json-ld-structured-data': 'json-ld-structured-data',
    'plugins/seo/llms': 'seo-llms',
    'plugins/seo/permalink-manager': 'seo-permalinks',
    'plugins/seo/robots': 'seo-robots',
    'plugins/seo/rss': 'seo-rss',
    'plugins/seo/sitemap': 'seo-sitemap',

    // Keep other plugins as-is (using their folder name)
    // These will automatically use their relative path if not mapped
};

// Clean and create public/plugins directory
if (existsSync(PUBLIC_PLUGINS_DIR)) {
    rmSync(PUBLIC_PLUGINS_DIR, {recursive: true});
}
mkdirSync(PUBLIC_PLUGINS_DIR, {recursive: true});

// Convert relative paths to absolute paths and validate
const pluginDirs = PLUGIN_PATHS
    .map(path => ({
        sourcePath: path,
        absolutePath: join(ROOT_DIR, path),
        outputPath: PATH_MAPPINGS[path] || path.replace('plugins/', '')
    }))
    .filter(plugin => {
        if (!existsSync(plugin.absolutePath)) {
            console.log(`⚠️  Plugin path not found: ${plugin.absolutePath}, skipping...`);
            return false;
        }
        if (!existsSync(join(plugin.absolutePath, 'package.json'))) {
            console.log(`⚠️  No package.json found in: ${plugin.absolutePath}, skipping...`);
            return false;
        }
        return true;
    });

const manifestEntries: ManifestEntry[] = [];

for (const plugin of pluginDirs) {
    const pluginName = basename(plugin.absolutePath);
    console.log(`📦 Building plugin: ${plugin.sourcePath} -> ${plugin.outputPath}`);

    const packageJsonPath = join(plugin.absolutePath, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const version = packageJson.version || '1.0.0';

    // Extract plugin manifest ID from the built plugin first (if available)
    let pluginId = pluginName; // Default to directory name

    // Try to get the actual plugin ID from package.json or manifest
    if (packageJson.pluginId) {
        pluginId = packageJson.pluginId;
    }

    // Set PLUGIN_BASE_URL for the build using the output path
    process.env.PLUGIN_BASE_URL = `${PLUGIN_HOST_URL}/plugins/${plugin.outputPath}/${version}`;

    try {
        // Build the plugin
        execSync('bun run build', {
            cwd: plugin.absolutePath,
            stdio: 'inherit',
            env: process.env
        });

        const distDir = join(plugin.absolutePath, 'dist');
        if (!existsSync(distDir)) {
            console.log(`⚠️  Build failed for ${pluginName} (no dist folder found)`);
            continue;
        }

        // Create versioned directory using the mapped output path
        const targetDir = join(PUBLIC_PLUGINS_DIR, plugin.outputPath, version);
        mkdirSync(targetDir, {recursive: true});
        cpSync(distDir, targetDir, {recursive: true});

        console.log(`✅ Plugin ${plugin.sourcePath} v${version} copied to public/plugins/${plugin.outputPath}/`);

        // Extract plugin metadata from the built plugin.js
        const pluginJsPath = join(targetDir, 'plugin.js');
        if (!existsSync(pluginJsPath)) {
            console.log(`⚠️  No plugin.js found for ${pluginName}, skipping manifest entry...`);
            continue;
        }

        // Read and execute the plugin to get metadata
        const pluginContent = readFileSync(pluginJsPath, 'utf-8');
        let pluginData: PluginManifest;

        try {
            // Execute the IIFE to get the plugin manifest
            pluginData = eval(pluginContent) as PluginManifest;
            // Use the actual plugin ID from the manifest
            if (pluginData.id) {
                pluginId = pluginData.id;
            }
        } catch (e) {
            console.log(`⚠️  Failed to extract metadata from ${pluginName}, using defaults`);
            pluginData = {
                id: pluginId,
                name: pluginName,
                version: version,
                author: 'Unknown'
            };
        }

        // Build manifest entry using the actual plugin ID
        const entry: ManifestEntry = {
            id: pluginId,
            name: pluginData.name || pluginName,
            version: version,
            author: pluginData.author || 'Unknown',
            path: `${PLUGIN_HOST_URL}/plugins/${plugin.outputPath}/${version}`,
            files: {}
        };

        if (pluginData.description) {
            entry.description = pluginData.description;
        }

        // Add file references
        if (existsSync(join(targetDir, 'plugin.js'))) {
            entry.files.plugin = `${PLUGIN_HOST_URL}/plugins/${plugin.outputPath}/${version}/plugin.js`;
        }

        manifestEntries.push(entry);

    } catch (error) {
        console.error(`❌ Failed to build ${pluginName}:`, error);
    }
}

// Generate manifest
const manifest = {
    generated: new Date().toISOString(),
    plugins: manifestEntries
};

writeFileSync(
    join(PUBLIC_PLUGINS_DIR, 'available.json'),
    JSON.stringify(manifest, null, 2)
);

console.log('✨ Plugins build complete!');
console.log('📄 Manifest generated at public/plugins/available.json');