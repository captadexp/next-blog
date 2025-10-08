import type {Plugin} from 'rollup';
import {injectIntoIifeAfterUseStrict, makeCssInjectionCode, processCssIfNeeded} from '../css-injection-utils.js';
import {existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync} from 'fs';
import {join} from 'path';

/**
 * Creates a plugin that injects CSS into the IIFE for client builds,
 * processing through TailwindCSS when directives are present.
 */
export function createCssInjectionPlugin(): Plugin {
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

            // Process combined CSS (for Tailwind directives if present)
            const processedCss = await processCssIfNeeded(combinedCss, outputDir);
            const injection = makeCssInjectionCode(processedCss);
            const {code, changed} = injectIntoIifeAfterUseStrict(jsContent, injection);

            if (!changed) return;

            // Write the modified JS file and remove all CSS files
            writeFileSync(jsPath, code);
            for (const cssPath of cssFilePaths) {
                unlinkSync(cssPath);
            }
        }
    };
}
