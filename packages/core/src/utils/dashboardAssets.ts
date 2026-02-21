import {DASHBOARD_STATIC_ASSETS} from "../generated/dashboardStaticAssets.js";

/**
 * Read a file from dashboard static assets (build-time embedded).
 * Zero filesystem reads — works in serverless, edge, everywhere.
 */
export function readStaticFile(relativePath: string) {
    if (relativePath in DASHBOARD_STATIC_ASSETS) {
        return Buffer.from(DASHBOARD_STATIC_ASSETS[relativePath], 'utf-8');
    }
    return null;
}

/**
 * Read an internal plugin file by its internal:// URL.
 * Uses the same embedded asset map — internal plugin paths are a subset.
 */
export function readInternalPluginFile(internalUrl: string): string | null {
    if (!internalUrl.startsWith('internal://')) return null;
    const relativePath = internalUrl.replace('internal://', '');
    if (!relativePath.startsWith('internal-plugins/')) return null;
    return DASHBOARD_STATIC_ASSETS[relativePath] ?? null;
}
