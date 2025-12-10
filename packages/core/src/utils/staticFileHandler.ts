import type {MinimumRequest, OneApiFunctionResponse, SessionData} from "@supergrowthai/oneapi";
import {BadRequest, Forbidden, InternalServerError, NotFound} from "@supergrowthai/oneapi";
import type {ApiExtra} from "../types/api.js";
import path from "path";
import {NextResponse} from "next/server";
import {readStaticFile} from "./dashboardAssets.js";

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
 * Handles static file requests using oneapi signature
 * @param session The oneapi session data
 * @param request The oneapi request
 * @param extra Extra parameters
 * @returns OneAPI response with file content or error
 */
export async function handleStaticFileRequest(session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse | Response> {
    try {
        // Extract file path from URL
        let filePath = '';

        if (request.url) {
            const url = new URL(request.url);
            const staticPrefix = '/api/next-blog/dashboard/static/';

            if (url.pathname.startsWith(staticPrefix)) {
                filePath = url.pathname.substring(staticPrefix.length);
            } else {
                // If params are available, use the catch-all parameter
                if (request._params && typeof request._params === 'object') {
                    // Look for wildcard parameters (could be '*', '...', '[...]', etc.)
                    const wildcardKey = Object.keys(request._params).find(key =>
                        key.includes('*') || key.includes('...') || key.includes('[')
                    );
                    if (wildcardKey) {
                        filePath = request._params[wildcardKey];
                    }
                }
            }
        }

        if (!filePath) {
            throw new BadRequest("No file path specified");
        }

        // Get the file extension
        const ext = path.extname(filePath).toLowerCase();

        // Check if the file extension is allowed
        if (!Object.keys(ALLOWED_EXTENSIONS).includes(ext)) {
            throw new Forbidden(`File type not allowed: ${ext}`);
        }

        // Get the MIME type for this extension
        const contentType = ALLOWED_EXTENSIONS[ext] || 'application/octet-stream';

        // Read the file using utility function (handles path validation and file existence)
        const content = readStaticFile(filePath);

        if (!content) {
            throw new NotFound(`File not found: ${filePath}`);
        }

        // Return as a proper Response with appropriate headers
        const cacheControl = process.env.NODE_ENV === 'production'
            ? 'public, max-age=31536000' // Cache for 1 year in production
            : 'no-cache'; // No cache in development

        return new NextResponse(content, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': cacheControl
            }
        });
    } catch (error) {
        console.error('Error serving static file:', error);
        throw new InternalServerError(`Error serving static file: ${error instanceof Error ? error.message : String(error)}`);
    }
}


