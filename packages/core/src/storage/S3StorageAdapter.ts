import type {StorageAdapter} from '@supergrowthai/types/server';
import {createHash} from 'crypto';

interface S3Config {
    accessKey: string;
    secretKey: string;
    region: string;
    bucket: string;
    basePath?: string;
}

/**
 * S3 storage adapter with dynamic imports
 * Provides cloud storage capabilities with automatic path scoping
 */
export class S3StorageAdapter implements StorageAdapter {
    private s3Client: any = null;
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
    }

    /**
     * Save a file to S3
     */
    async save(path: string, content: Buffer | Uint8Array | string): Promise<string> {
        await this.ensureS3Client();

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

        const command = new (this as any).Commands.PutObjectCommand({
            Bucket: this.config.bucket,
            Key: key,
            Body: buffer,
            ContentType: this.getContentType(path)
        });

        await this.s3Client.send(command);
        return path;
    }

    /**
     * Read a file from S3
     */
    async read(path: string): Promise<Buffer> {
        await this.ensureS3Client();

        const key = this.getS3Key(path);

        const command = new (this as any).Commands.GetObjectCommand({
            Bucket: this.config.bucket,
            Key: key
        });

        try {
            const response = await this.s3Client.send(command);
            const stream = response.Body;

            // Convert stream to Buffer
            const chunks: Uint8Array[] = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
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
        await this.ensureS3Client();

        const key = this.getS3Key(path);

        const command = new (this as any).Commands.DeleteObjectCommand({
            Bucket: this.config.bucket,
            Key: key
        });

        await this.s3Client.send(command);
    }

    /**
     * List files in S3
     */
    async list(prefix?: string): Promise<string[]> {
        await this.ensureS3Client();

        const searchPrefix = prefix
            ? `${this.fullBasePath}/${prefix}`
            : this.fullBasePath;

        const files: string[] = [];
        let continuationToken: string | undefined;

        do {
            const command = new (this as any).Commands.ListObjectsV2Command({
                Bucket: this.config.bucket,
                Prefix: searchPrefix,
                ContinuationToken: continuationToken
            });

            const response = await this.s3Client.send(command);

            if (response.Contents) {
                for (const object of response.Contents) {
                    // Remove base path from the key to return relative paths
                    const relativePath = object.Key.substring(this.fullBasePath.length + 1);
                    if (relativePath) {
                        files.push(relativePath);
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
        await this.ensureS3Client();

        const key = this.getS3Key(path);

        const command = new (this as any).Commands.HeadObjectCommand({
            Bucket: this.config.bucket,
            Key: key
        });

        try {
            await this.s3Client.send(command);
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

        // Return the S3 URL (assumes bucket is public or using CloudFront)
        return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
    }

    /**
     * Initialize S3 client lazily with dynamic import
     */
    private async ensureS3Client() {
        if (this.s3Client) return this.s3Client;

        try {
            // Dynamic import of AWS SDK S3 client
            const {
                S3Client,
                PutObjectCommand,
                GetObjectCommand,
                DeleteObjectCommand,
                ListObjectsV2Command,
                HeadObjectCommand
            } =
                await import('@aws-sdk/client-s3');

            this.s3Client = new S3Client({
                region: this.config.region,
                credentials: {
                    accessKeyId: this.config.accessKey,
                    secretAccessKey: this.config.secretKey
                }
            });

            // Store command constructors for later use
            (this as any).Commands = {
                PutObjectCommand,
                GetObjectCommand,
                DeleteObjectCommand,
                ListObjectsV2Command,
                HeadObjectCommand
            };

            return this.s3Client;
        } catch (error) {
            throw new Error(`Failed to initialize S3 client: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
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