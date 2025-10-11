import type {Plugin} from "vite";
import {injectIntoIifeAfterUseStrict, makeCssInjectionCode, processCssIfNeeded} from '../css-injection-utils.js';
import {existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync} from 'fs';
import {join} from 'path';

/**
 * Reads the plugin manifest to get the plugin ID
 */
function getPluginId(root: string): string | null {
    try {
        // Look for plugin manifest in various paths
        const possiblePaths = [
            join(root, 'src', 'index.ts'),
            join(root, 'src', 'index.js'),
            join(root, 'index.ts'),
            join(root, 'index.js')
        ];

        for (const manifestPath of possiblePaths) {
            if (existsSync(manifestPath)) {
                const content = readFileSync(manifestPath, 'utf-8');
                // Look for plugin ID in definePlugin call
                const idMatch = content.match(/id:\s*['"]([\w-]+)['"]/);
                if (idMatch) {
                    return idMatch[1];
                }
            }
        }
        return null;
    } catch (err) {
        console.warn('Failed to read plugin ID from manifest:', err);
        return null;
    }
}

/**
 * Creates a plugin that injects CSS into the IIFE for client builds,
 * processing through TailwindCSS when directives are present.
 */
export function createCssInjectionPlugin(config: { mode?: string, root: string }): Plugin {
    const isProduction = config.mode === 'production';
    const root = config.root;

    return {
        name: 'css-inject-iife',

        async writeBundle(options, bundle) {
            if (!options.dir) return;

            // Find the JS file in the bundle
            let jsFileName: string | null = null;
            for (const fileName in bundle) {
                if (bundle[fileName].type === 'chunk' && fileName.endsWith('.js')) {
                    jsFileName = fileName;
                    break;
                }
            }

            if (!jsFileName) return;

            // Look for CSS files in the output directory
            const outputDir = options.dir;
            const files = readdirSync(outputDir);
            const cssFiles = files.filter(file => file.endsWith('.css'));

            if (cssFiles.length === 0) return;

            const jsPath = join(outputDir, jsFileName);
            if (!existsSync(jsPath)) return;

            // Read and combine all CSS files
            let combinedCss = '';
            const cssFilePaths: string[] = [];

            for (const cssFile of cssFiles) {
                const cssPath = join(outputDir, cssFile);
                if (existsSync(cssPath)) {
                    const cssContent = readFileSync(cssPath, 'utf-8');
                    // Add a comment separator between different CSS files for debugging
                    if (combinedCss) {
                        combinedCss += '\n\n';
                    }
                    combinedCss += cssContent;
                    cssFilePaths.push(cssPath);
                }
            }

            if (!combinedCss) return;

            const jsContent = readFileSync(jsPath, 'utf-8');

            // Get plugin ID for scoping
            const pluginId = getPluginId(root);

            // Process combined CSS (for Tailwind directives if present, then scope to plugin)
            const processedCss = await processCssIfNeeded(combinedCss, outputDir, pluginId || undefined);
            const injection = makeCssInjectionCode(processedCss, pluginId || undefined);
            const {code, changed} = injectIntoIifeAfterUseStrict(jsContent, injection);

            if (!changed) return;

            // Write the modified JS file and remove CSS files only in production
            writeFileSync(jsPath, code);
            if (isProduction) {
                for (const cssPath of cssFilePaths) {
                    unlinkSync(cssPath);
                }
            }
        }
    };
}
