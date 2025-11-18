import path from "path";
import fs from "fs";
import {fileURLToPath} from "url";

/**
 * Get the path to dashboard package assets
 * This is used by both staticFileHandler and pluginManager
 */
export function getDashboardAssetsPath(): string {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    // Path to this package - matches staticFileHandler.ts logic
    return path.join(__dirname, 'assets', '@supergrowthai', 'next-blog-dashboard');
}

/**
 * Get the path to a static file in dashboard assets with security checks
 * @param relativePath Path relative to dashboard/dist/static
 * @returns Safe path or null if path traversal detected
 */
export function getStaticFilePath(relativePath: string): string | null {
    // Sanitize path to prevent directory traversal
    const sanitized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');

    // Ensure no path traversal attempts
    if (sanitized.includes('..') || path.isAbsolute(sanitized)) {
        return null;
    }

    const basePath = path.join(getDashboardAssetsPath(), 'static');
    const fullPath = path.join(basePath, sanitized);

    // Ensure the resolved path is within the allowed directory
    const resolvedBase = path.resolve(basePath);
    const resolvedFull = path.resolve(fullPath);

    if (!resolvedFull.startsWith(resolvedBase)) {
        return null; // Path traversal attempt detected
    }

    return fullPath;
}

/**
 * Read a file from dashboard static assets with security checks
 * @param relativePath Path relative to dashboard/dist/static
 * @returns File contents or null if not found or security check fails
 */
export function readStaticFile(relativePath: string) {
    const fullPath = getStaticFilePath(relativePath);

    if (!fullPath || !fs.existsSync(fullPath)) {
        return null;
    }

    return fs.readFileSync(fullPath);
}

/**
 * Read an internal plugin file
 * @param internalUrl The internal plugin url (e.g., internal://internal-plugins/system/plugin.js)
 * @returns File contents or null if not found
 */
export function readInternalPluginFile(internalUrl: string): string | null {
    // Strip internal:// prefix and extract the path
    if (!internalUrl.startsWith('internal://')) {
        return null;
    }

    const relativePath = internalUrl.replace('internal://', '');

    // Basic validation - must be under internal-plugins directory
    if (!relativePath.startsWith('internal-plugins/')) {
        return null;
    }

    const content = readStaticFile(relativePath);
    return content ? content.toString('utf-8') : null;
}