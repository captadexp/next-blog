import {NextFunction, Request, Response} from 'express';
import {getCachedMatch,} from '../parse-path';
import {BadRequest, Exception, Forbidden, NotFound, Success, UnAuthorised} from '../errors';
import {IRouterConfig, MinimumRequest, PathObject, SessionData} from '../types';

export interface ExpressRouterConfig extends IRouterConfig {
}

/**
 * Express-specific OneAPI Router
 */
export class ExpressRouter {
    constructor(
        private pathObject: PathObject,
        private config: ExpressRouterConfig = {}
    ) {
    }

    /**
     * Creates Express middleware for handling all routes
     */
    middleware() {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                const path = this.config.pathPrefix
                    ? req.path.replace(this.config.pathPrefix, '')
                    : req.path;

                // Match the path to find handler
                const {params, handler, templatePath} = getCachedMatch(this.pathObject, path);

                console.log("Express =>", req.method, templatePath, params, "executing:", !!handler);

                if (!handler) {
                    throw new NotFound();
                }

                // Get session and user
                let session = null;
                let user = null;

                if (this.config.authHandler) {
                    session = await this.config.authHandler.getSession(req as any, res as any);
                    user = await this.config.authHandler.getUser(req as any, res as any);
                }

                // Check if handler wants raw body (no parsing)
                const shouldParseBody = handler.config?.parseBody !== false;

                // For Express, body parsing is typically done by middleware before this point
                // If parseBody is false, we need to access the raw body
                // Note: This requires that body-parser middleware is configured conditionally
                let body = shouldParseBody ? req.body : undefined;

                // Normalize request
                const normalizedRequest: MinimumRequest = {
                    query: req.query,
                    body,
                    method: req.method as any,
                    headers: req.headers,
                    cookies: req.cookies,
                    url: req.url,
                    _response: res,
                    _request: req,
                    _params: params
                };

                // Create session data
                const sessionData: SessionData = {
                    user,
                    domain: req.get('host') || null,
                    api: await this.config.createApiImpl?.({
                        request: req,
                        response: res,
                        session
                    }) || null,
                    authHandler: this.config.authHandler,
                    session
                };

                // Call the handler
                const response = await handler(
                    sessionData,
                    normalizedRequest,
                    {}
                );

                // Handle response
                if (response && 'code' in response) {
                    const {code, message, payload} = response;
                    const httpStatus = this.getHttpStatus(code);
                    return res.status(httpStatus).json({code, message, payload});
                } else {
                    // Default response
                    return res.json(response);
                }

            } catch (e: any) {
                return this.handleError(e, req, res);
            }
        };
    }

    private getHttpStatus(code: number): number {
        // Standard HTTP status codes
        if (code === 0) return 200; // Success
        if (code >= 100 && code < 600) return code; // Valid HTTP status
        if (code < 0) return 200; // Application success codes
        return 500; // Default to internal server error
    }

    private async handleError(e: any, req: Request, res: Response) {
        if (e instanceof UnAuthorised) {
            if (this.config.authHandler) {
                await this.config.authHandler.logout(req as any, res as any);
            } else {
                (req as any).session?.destroy?.();
            }
            return res.status(401).json({code: e.code, message: e.message});
        } else if (e instanceof Forbidden) {
            return res.status(403).json({code: e.code, message: e.message});
        } else if (e instanceof NotFound) {
            return res.status(404).json({code: e.code, message: e.message});
        } else if (e instanceof BadRequest) {
            return res.status(400).json({code: e.code, message: e.message});
        } else if (e instanceof Success) {
            return res.status(200).json({code: e.code, message: e.message, payload: e.payload});
        } else if (e instanceof Exception) {
            const httpCode = this.getHttpStatus(e.code);
            return res.status(httpCode).json({code: e.code, message: e.message});
        } else {
            console.error(e);
            return res.status(503).json({
                code: 503,
                message: `Internal Server Error: ${e.message || 'Unknown error'}`
            });
        }
    }
}

/**
 * Factory function to create Express router
 */
export function createExpressRouter(pathObject: PathObject, config?: ExpressRouterConfig) {
    return new ExpressRouter(pathObject, config);
}