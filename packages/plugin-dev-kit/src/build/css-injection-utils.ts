/**
 * Creates the JavaScript code that injects CSS into the document head
 */
export function makeCssInjectionCode(css: string): string {
    return `
// Inject CSS hello
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
 * Processes CSS through TailwindCSS if it contains Tailwind directives
 */
export async function processCssIfNeeded(css: string, fromPath: string): Promise<string> {
    const hasTailwindDirectives = (css: string) =>
        css.includes('@tailwind') || css.includes('@import "tailwindcss"') || css.includes("@import 'tailwindcss'");

    if (!hasTailwindDirectives(css)) return css;
    try {
        const postcss = await import('postcss');
        const tailwindcss = await import('tailwindcss');
        const result = await postcss.default([tailwindcss.default]).process(css, {from: fromPath, to: undefined});
        return result.css;
    } catch (err) {
        console.warn('TailwindCSS processing failed, using raw CSS:', err);
        return css;
    }
}
