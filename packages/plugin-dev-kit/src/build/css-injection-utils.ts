import postcss, {PluginCreator} from 'postcss';
import tailwindcss from 'tailwindcss';

/**
 * Creates the JavaScript code that injects CSS into the document head
 */
export function makeCssInjectionCode(css: string, _pluginId?: string): string {
    return `
// Inject CSS
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = ${JSON.stringify(css)};
  document.head.appendChild(style);
}

`;
}

/**
 * Injects code into an IIFE after the "use strict" directive
 */
export function injectIntoIifeAfterUseStrict(jsCode: string, injection: string): { code: string; changed: boolean } {
    const pattern1 = /(function\(\)\s*{\s*"use strict";\s*)/;
    const pattern2 = /(\(function\(\)\s*{\s*"use strict";\s*)/; // alt pattern
    let code = jsCode.replace(pattern1, `$1${injection}`);
    if (code !== jsCode) return {code, changed: true};
    code = jsCode.replace(pattern2, `$1${injection}`);
    return {code, changed: code !== jsCode};
}

/**
 * Processes CSS through TailwindCSS if it contains Tailwind directives,
 * then scopes it to a plugin if pluginId is provided
 */
export async function processCssIfNeeded(css: string, fromPath: string, pluginId?: string): Promise<string> {
    const hasTailwindDirectives = (css: string) =>
        css.includes('@tailwind') || css.includes('@import "tailwindcss"') || css.includes("@import 'tailwindcss'");

    let processedCss = css;

    // Process with Tailwind if needed
    if (hasTailwindDirectives(css)) {
        try {
            const result = await postcss([tailwindcss]).process(css, {from: fromPath, to: undefined});
            processedCss = result.css;
        } catch (err) {
            console.warn('TailwindCSS processing failed, using raw CSS:', err);
        }
    }

    // Scope CSS to plugin if pluginId provided
    if (pluginId) {
        try {
            console.log(`[CSS Scoping] Starting CSS scoping for plugin: ${pluginId}`);
            const scopedCss = await scopeCssWithPostCSS(processedCss, pluginId);
            console.log(`[CSS Scoping] Completed CSS scoping for plugin: ${pluginId}`);
            return scopedCss;
        } catch (err) {
            console.warn('CSS scoping failed, using unscoped CSS:', err);
            return processedCss;
        }
    }

    return processedCss;
}

/**
 * Scopes CSS to a plugin using PostCSS for proper parsing
 */
async function scopeCssWithPostCSS(css: string, pluginId: string): Promise<string> {
    const pluginClass = `.plugin-${pluginId}`;

    // Create a PostCSS plugin to scope selectors
    const scopingPlugin: PluginCreator<{}> = (_opts = {}) => {
        return {
            postcssPlugin: 'plugin-scoping',
            Once(root) {
                // Walk through ALL rules in the entire CSS tree once
                root.walkRules((rule) => {
                    // Scope ALL selectors - no exceptions
                    rule.selector = rule.selector
                        .split(',')
                        .map((sel: string) => {
                            const trimmed = sel.trim();
                            if (!trimmed) return '';

                            // Replace :root with plugin class
                            if (trimmed === ':root') {
                                return pluginClass;
                            }

                            // For other selectors, add plugin class as parent
                            return `${pluginClass} ${trimmed}`;
                        })
                        .filter(Boolean)
                        .join(', ');
                });
            }
        };
    };
    scopingPlugin.postcss = true;

    const result = await postcss([scopingPlugin()]).process(css, {from: undefined});
    return result.css;
}
