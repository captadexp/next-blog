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

            // Read the CSS content
            const cssPath = join(outputDir, cssFiles[0]);
            const jsPath = join(outputDir, jsFileName);

            if (!existsSync(cssPath) || !existsSync(jsPath)) return;

            const cssContent = readFileSync(cssPath, 'utf-8');
            const jsContent = readFileSync(jsPath, 'utf-8');

            const processedCss = await processCssIfNeeded(cssContent, cssPath);
            const injection = makeCssInjectionCode(processedCss);
            const {code, changed} = injectIntoIifeAfterUseStrict(jsContent, injection);

            if (!changed) return;

            // Write the modified JS file and remove the CSS file
            writeFileSync(jsPath, code);
            unlinkSync(cssPath);
        }
    };
}
