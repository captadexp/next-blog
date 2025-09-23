import type {PluginStorage} from '@supergrowthai/types/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import {createHash} from 'crypto';

// Base directory for plugin storage
const STORAGE_BASE = process.env.PLUGIN_STORAGE_PATH || './plugin-storage';

/**
 * Server-side storage helper for plugins with automatic fingerprinting
 * Each plugin gets its own isolated directory
 */
export class ServerStorageHelper implements PluginStorage {
    private readonly storageDir: string;

    constructor(private readonly pluginId: string) {
        // Create a safe directory name from plugin ID
        const safePluginId = this.sanitizePluginId(pluginId);
        this.storageDir = path.join(STORAGE_BASE, safePluginId);
    }

    /**
     * Save a file (automatically scoped to plugin directory)
     */
    async save(filePath: string, content: Buffer | Uint8Array | string): Promise<string> {
        await this.ensureDirectory();

        const fullPath = this.getFilePath(filePath);
        const dir = path.dirname(fullPath);

        // Ensure subdirectory exists
        await fs.mkdir(dir, {recursive: true});

        // Convert content to Buffer if needed
        let buffer: Buffer;
        if (typeof content === 'string') {
            buffer = Buffer.from(content, 'utf-8');
        } else if (content instanceof Uint8Array) {
            buffer = Buffer.from(content);
        } else {
            buffer = content;
        }

        // Write the file
        await fs.writeFile(fullPath, buffer);

        // Return the relative path within plugin storage
        return filePath;
    }

    /**
     * Read a file
     */
    async read(filePath: string): Promise<Buffer> {
        const fullPath = this.getFilePath(filePath);

        try {
            return await fs.readFile(fullPath);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                throw new Error(`File not found: ${filePath}`);
            }
            throw error;
        }
    }

    /**
     * Delete a file
     */
    async delete(filePath: string): Promise<void> {
        const fullPath = this.getFilePath(filePath);

        try {
            await fs.unlink(fullPath);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, consider it deleted
                return;
            }
            throw error;
        }
    }

    /**
     * List files in plugin storage
     */
    async list(prefix?: string): Promise<string[]> {
        await this.ensureDirectory();

        const searchDir = prefix
            ? this.getFilePath(prefix)
            : this.storageDir;

        const files: string[] = [];

        async function walkDir(dir: string, baseDir: string): Promise<void> {
            try {
                const entries = await fs.readdir(dir, {withFileTypes: true});

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory()) {
                        await walkDir(fullPath, baseDir);
                    } else if (entry.isFile()) {
                        // Return relative path from plugin storage root
                        const relativePath = path.relative(baseDir, fullPath);
                        files.push(relativePath);
                    }
                }
            } catch (error: any) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }
        }

        await walkDir(searchDir, this.storageDir);
        return files;
    }

    /**
     * Check if file exists
     */
    async exists(filePath: string): Promise<boolean> {
        const fullPath = this.getFilePath(filePath);

        try {
            await fs.access(fullPath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get public URL for a file (if applicable)
     * Note: This would need to be implemented based on your serving strategy
     */
    async getUrl(filePath: string): Promise<string | null> {
        const exists = await this.exists(filePath);
        if (!exists) {
            return null;
        }

        // TODO: Implement based on how plugin files are served
        // For now, return a placeholder URL structure
        const safePluginId = this.sanitizePluginId(this.pluginId);
        return `/plugin-storage/${safePluginId}/${filePath}`;
    }

    /**
     * Sanitize plugin ID for use as directory name
     */
    private sanitizePluginId(id: string): string {
        // Replace unsafe characters with hyphens
        const sanitized = id.replace(/[^a-zA-Z0-9-_]/g, '-');

        // If the result is too generic or empty, use a hash
        if (!sanitized || sanitized === '-') {
            return createHash('md5').update(id).digest('hex');
        }

        return sanitized;
    }

    /**
     * Ensure the plugin storage directory exists
     */
    private async ensureDirectory(): Promise<void> {
        try {
            await fs.mkdir(this.storageDir, {recursive: true});
        } catch (error) {
            console.error(`Failed to create storage directory for plugin ${this.pluginId}:`, error);
            throw new Error('Failed to initialize plugin storage');
        }
    }

    /**
     * Get the full path for a file (with security checks)
     */
    private getFilePath(filePath: string): string {
        // Normalize and resolve the path
        const normalized = path.normalize(filePath);
        const fullPath = path.join(this.storageDir, normalized);

        // Security check: ensure the path is within the plugin's directory
        const relative = path.relative(this.storageDir, fullPath);
        if (relative.startsWith('..')) {
            throw new Error('Invalid file path: cannot access files outside plugin storage');
        }

        return fullPath;
    }
}