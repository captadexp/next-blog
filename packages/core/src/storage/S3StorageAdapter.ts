import "./pollyfill.js"
import type {StorageAdapter} from '@supergrowthai/next-blog-types/server';
import {createHash} from 'crypto';
import {S3} from '@aws-sdk/client-s3';
import {Upload} from '@aws-sdk/lib-storage';


interface S3Config {
    accessKey: string;
    secretKey: string;
    region: string;
    bucket: string;
    basePath?: string;
    cdnHostname?: string;
}

/**
 * S3 storage adapter with static imports
 * Provides cloud storage capabilities with automatic path scoping
 */
export class S3StorageAdapter implements StorageAdapter {
    private readonly s3: S3;
    private readonly fullBasePath: string;

    constructor(
        private readonly pluginId: string,
        private readonly config: S3Config
    ) {
        // Combine base path with plugin-specific directory
        const safePluginId = this.sanitizePluginId(pluginId);
        this.fullBasePath = this.config.basePath
            ? `${this.config.basePath}/${safePluginId}`
            : safePluginId;

        // Initialize S3 client
        this.s3 = new S3({
            region: this.config.region,
            credentials: {
                accessKeyId: this.config.accessKey,
                secretAccessKey: this.config.secretKey
            }
        });
    }

    /**
     * Save a file to S3
     */
    async save(path: string, content: Buffer | Uint8Array | string): Promise<string> {
        const key = this.getS3Key(path);

        // Convert content to Buffer
        let buffer: Buffer;
        if (typeof content === 'string') {
            buffer = Buffer.from(content, 'utf-8');
        } else if (content instanceof Uint8Array) {
            buffer = Buffer.from(content);
        } else {
            buffer = content;
        }

        const upload = new Upload({
            client: this.s3,
            params: {
                Bucket: this.config.bucket,
                Key: key,
                Body: buffer,
                ContentType: this.getContentType(path)
            }
        });

        await upload.done();
        return path;
    }

    /**
     * Read a file from S3
     */
    async read(path: string): Promise<Buffer> {
        const key = this.getS3Key(path);

        try {
            const response = await this.s3.getObject({
                Bucket: this.config.bucket,
                Key: key
            });

            if (!response.Body) {
                throw new Error(`File not found: ${path}`);
            }

            // Convert Body to string then to Buffer
            const bodyStr = await response.Body.transformToString();
            return Buffer.from(bodyStr);
        } catch (error: any) {
            if (error.name === 'NoSuchKey') {
                throw new Error(`File not found: ${path}`);
            }
            throw error;
        }
    }

    /**
     * Delete a file from S3
     */
    async delete(path: string): Promise<void> {
        const key = this.getS3Key(path);

        await this.s3.deleteObject({
            Bucket: this.config.bucket,
            Key: key
        });
    }

    /**
     * List files in S3
     */
    async list(prefix?: string): Promise<string[]> {
        const searchPrefix = prefix
            ? `${this.fullBasePath}/${prefix}`
            : this.fullBasePath;

        const files: string[] = [];
        let continuationToken: string | undefined;

        do {
            const response = await this.s3.listObjectsV2({
                Bucket: this.config.bucket,
                Prefix: searchPrefix,
                ContinuationToken: continuationToken
            });

            if (response.Contents) {
                for (const object of response.Contents) {
                    if (object.Key) {
                        // Remove base path from the key to return relative paths
                        const relativePath = object.Key.substring(this.fullBasePath.length + 1);
                        if (relativePath) {
                            files.push(relativePath);
                        }
                    }
                }
            }

            continuationToken = response.NextContinuationToken;
        } while (continuationToken);

        return files;
    }

    /**
     * Check if file exists in S3
     */
    async exists(path: string): Promise<boolean> {
        const key = this.getS3Key(path);

        try {
            await this.s3.headObject({
                Bucket: this.config.bucket,
                Key: key
            });
            return true;
        } catch (error: any) {
            if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
                return false;
            }
            throw error;
        }
    }

    /**
     * Get public URL for a file
     */
    async getUrl(path: string): Promise<string | null> {
        const exists = await this.exists(path);
        if (!exists) {
            return null;
        }

        const key = this.getS3Key(path);

        // Use CDN hostname if configured, otherwise use default S3 URL
        if (this.config.cdnHostname) {
            return `https://${this.config.cdnHostname}/${key}`;
        }

        // Return the S3 URL (assumes bucket is public or using CloudFront)
        return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
    }

    /**
     * Get the full S3 key for a file
     */
    private getS3Key(path: string): string {
        // Normalize and clean the path
        const normalized = path.replace(/^\/+/, '').replace(/\/+/g, '/');
        const fullPath = `${this.fullBasePath}/${normalized}`;

        // Security check: ensure the path doesn't escape the base path
        if (fullPath.includes('..')) {
            throw new Error('Invalid file path: cannot use .. in path');
        }

        return fullPath;
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
     * Get content type based on file extension
     */
    private getContentType(path: string): string {
        const ext = path.split('.').pop()?.toLowerCase();

        const contentTypes: Record<string, string> = {
            'json': 'application/json',
            'txt': 'text/plain',
            'html': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'pdf': 'application/pdf'
        };

        return contentTypes[ext || ''] || 'application/octet-stream';
    }
}