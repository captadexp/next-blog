import type {Plugin} from 'vite';

/**
 * Creates a plugin that removes variable assignments from IIFE output
 * Transforms `var Name = (function(){})()` to `(function(){})()`
 */
export function createIifeWrapperPlugin(): Plugin {
    return {
        name: 'wrap-iife',
        generateBundle(_options, bundle) {
            for (const fileName in bundle) {
                if (bundle[fileName].type === 'chunk') {
                    bundle[fileName].code = bundle[fileName].code.replace(
                        /^var\s+\w+\s*=\s*/,
                        ''
                    );
                }
            }
        }
    };
}