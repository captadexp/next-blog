import {CNextRequest} from "../types";
import path from "path";
import fs from "fs";

// Map of allowed file extensions and their MIME types
const ALLOWED_EXTENSIONS: Record<string, string> = {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.map': 'application/json',
};

/**
 * Handles static file requests
 * @param request The Next.js API request
 * @param filePath The path of the file relative to the static directory
 * @returns Response with the file content or appropriate error
 */
export async function handleStaticFileRequest(request: CNextRequest, filePath: string): Promise<Response> {
    // If we're handling a request with '*' path pattern, extract the real path from the URL
    if (request.nextUrl && filePath === '*') {
        const staticPrefix = '/api/next-blog/dashboard/static/';
        const urlPath = request.nextUrl.pathname;
        if (urlPath.startsWith(staticPrefix)) {
            filePath = urlPath.substring(staticPrefix.length);
        }
    }
    try {
        // Sanitize the file path to prevent directory traversal attacks
        const sanitizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');

        // Get the file extension
        const ext = path.extname(sanitizedPath).toLowerCase();

        // Check if the file extension is allowed
        if (!Object.keys(ALLOWED_EXTENSIONS).includes(ext)) {
            return new Response(`File type not allowed: ${ext}`, {
                status: 403,
                headers: {'Content-Type': 'text/plain'}
            });
        }

        // Get the MIME type for this extension
        const contentType = ALLOWED_EXTENSIONS[ext] || 'application/octet-stream';

        // Path to this package
        const pkgPath = path.dirname(require.resolve('@supergrowthai/next-blog-dashboard/package.json'));

        // Full path to the static file
        const fullPath = path.join(pkgPath, 'dist', 'static', sanitizedPath);

        // Check if the file exists
        if (!fs.existsSync(fullPath)) {
            return new Response(`File not found: ${sanitizedPath}`, {
                status: 404,
                headers: {'Content-Type': 'text/plain'}
            });
        }

        // Read the file
        const content = fs.readFileSync(fullPath);

        // Return the file with proper MIME type
        return new Response(content, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': process.env.NODE_ENV === 'production'
                    ? 'public, max-age=31536000' // Cache for 1 year in production
                    : 'no-cache' // No cache in development
            }
        });
    } catch (error: any) {
        console.error('Error serving static file:', error);
        return new Response(`Error serving static file: ${error.message}`, {
            status: 500,
            headers: {'Content-Type': 'text/plain'}
        });
    }
}