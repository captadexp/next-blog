import type {Plugin} from 'vite';
import {resolve} from 'path';

/**
 * Creates a plugin that injects the actual version from package.json
 */
export function createVersionInjectionPlugin(pluginEntryPath: string, version: string): Plugin {
    const normalizedEntry = resolve(pluginEntryPath);
    return {
        name: 'version-inject',
        transform(code: string, id: string) {
            if (resolve(id) === normalizedEntry) {
                return code.replace(
                    /version:\s*['\"`][\d.]+['\"`]/g,
                    `version: '${version}'`
                );
            }
            return null;
        },
    };
}