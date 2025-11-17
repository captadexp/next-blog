import path from "path";
import fs from "fs";
import {fileURLToPath} from "url";

/**
 * Get the path to dashboard package assets
 * This is used by both staticFileHandler and pluginManager
 */
export function getDashboardAssetsPath(): string {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    // Navigate to dashboard package dist directory
    // From core/src/utils -> core -> packages -> dashboard/dist
    return path.join(__dirname, '..', '..', '..', 'dashboard', 'dist');
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
export function readStaticFile(relativePath: string): string | null {
    const fullPath = getStaticFilePath(relativePath);

    if (!fullPath || !fs.existsSync(fullPath)) {
        return null;
    }

    return fs.readFileSync(fullPath, 'utf-8');
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

    return readStaticFile(relativePath);
}