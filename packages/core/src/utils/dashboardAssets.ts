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

    if (!fullPath) {
        console.warn("Computed fullpath is null", relativePath)
        return null;
    }

    if (!fs.existsSync(fullPath)) {
        console.warn("File not found", fullPath);
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        debugDirectoryStructure(__dirname, fullPath);
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

/**
 * Recursively prints directory tree structure
 */
function printDirectoryTree(dirPath: string, prefix: string = "", maxDepth: number = 4, currentDepth: number = 0): void {
    if (currentDepth >= maxDepth || !fs.existsSync(dirPath)) return;

    try {
        const items = fs.readdirSync(dirPath, {withFileTypes: true}).sort((a, b) => {
            // Sort directories first, then files
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
        });

        items.forEach((item, index) => {
            const isLast = index === items.length - 1;
            const currentPrefix = prefix + (isLast ? "└── " : "├── ");
            const nextPrefix = prefix + (isLast ? "    " : "│   ");

            console.warn(`${currentPrefix}${item.name}${item.isDirectory() ? '/' : ''}`);

            if (item.isDirectory()) {
                const itemPath = path.join(dirPath, item.name);
                printDirectoryTree(itemPath, nextPrefix, maxDepth, currentDepth + 1);
            }
        });
    } catch (err) {
        console.warn(`${prefix}[Error reading directory: ${err}]`);
    }
}

/**
 * Debug function to log directory structure and path information
 */
function debugDirectoryStructure(
    __dirname: string,
    fullPath: string
) {

    if (!process.env.DEBUG_MISSING_FILE)
        return;

    console.warn("Debug - Path construction:");
    console.warn("- import.meta.url:", import.meta.url);
    console.warn("- __dirname:", __dirname);
    console.warn("- fullPath:", fullPath);

    // Print complete directory tree from 2 levels above __dirname
    const grandParentDir = path.dirname(path.dirname(__dirname));
    console.warn("\n=== COMPLETE DIRECTORY TREE ===");
    console.warn(`Starting from: ${grandParentDir}`);
    printDirectoryTree(grandParentDir);

    console.warn("\n=== __dirname TREE ===");
    console.warn(`Starting from: ${__dirname}`);
    printDirectoryTree(__dirname);

    console.warn("\n=== PARENT DIR TREE ===");
    const parentDir = path.dirname(__dirname);
    console.warn(`Starting from: ${parentDir}`);
    printDirectoryTree(parentDir);

    // Check parent directory of requested file
    const requestedDir = path.dirname(fullPath);
    console.warn("- requestedDir:", requestedDir);
    console.warn("- requestedDir exists:", fs.existsSync(requestedDir));
}
