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

// Clean and create public/plugins directory
if (existsSync(PUBLIC_PLUGINS_DIR)) {
    rmSync(PUBLIC_PLUGINS_DIR, {recursive: true});
}
mkdirSync(PUBLIC_PLUGINS_DIR, {recursive: true});

// Convert relative paths to absolute paths and validate
const pluginDirs = PLUGIN_PATHS
    .map(path => join(ROOT_DIR, path))
    .filter(dir => {
        if (!existsSync(dir)) {
            console.log(`⚠️  Plugin path not found: ${dir}, skipping...`);
            return false;
        }
        if (!existsSync(join(dir, 'package.json'))) {
            console.log(`⚠️  No package.json found in: ${dir}, skipping...`);
            return false;
        }
        return true;
    });

const manifestEntries: ManifestEntry[] = [];

for (const pluginDir of pluginDirs) {
    // Get relative path from plugins directory to maintain nesting structure
    const relativePath = pluginDir.replace(join(ROOT_DIR, 'plugins/'), '');
    const pluginName = basename(pluginDir);
    console.log(`📦 Building plugin: ${relativePath}`);

    const packageJsonPath = join(pluginDir, 'package.json');
    if (!existsSync(packageJsonPath)) {
        console.log(`⚠️  No package.json found for ${pluginName}, skipping...`);
        continue;
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const version = packageJson.version || '1.0.0';

    // Extract plugin manifest ID from the built plugin first (if available)
    let pluginId = pluginName; // Default to directory name

    // Try to get the actual plugin ID from package.json or manifest
    if (packageJson.pluginId) {
        pluginId = packageJson.pluginId;
    }

    // Set PLUGIN_BASE_URL for the build using the relative path structure
    process.env.PLUGIN_BASE_URL = `${PLUGIN_HOST_URL}/plugins/${relativePath}/${version}`;

    try {
        // Build the plugin
        execSync('bun run build', {
            cwd: pluginDir,
            stdio: 'inherit',
            env: process.env
        });

        const distDir = join(pluginDir, 'dist');
        if (!existsSync(distDir)) {
            console.log(`⚠️  Build failed for ${pluginName} (no dist folder found)`);
            continue;
        }

        // Create versioned directory maintaining the folder structure
        const targetDir = join(PUBLIC_PLUGINS_DIR, relativePath, version);
        mkdirSync(targetDir, {recursive: true});
        cpSync(distDir, targetDir, {recursive: true});

        console.log(`✅ Plugin ${relativePath} v${version} copied to public/plugins/`);

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
            path: `${PLUGIN_HOST_URL}/plugins/${relativePath}/${version}`,
            files: {}
        };

        if (pluginData.description) {
            entry.description = pluginData.description;
        }

        // Add file references
        if (existsSync(join(targetDir, 'plugin.js'))) {
            entry.files.plugin = `${PLUGIN_HOST_URL}/plugins/${relativePath}/${version}/plugin.js`;
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