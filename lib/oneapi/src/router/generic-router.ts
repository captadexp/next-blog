import {getCachedMatch} from '../parse-path.js';
import {
    BadRequest,
    Exception,
    Forbidden,
    HttpException,
    InternalServerError,
    MethodNotAllowed,
    NotFound,
    Success,
    UnAuthorised
} from '../errors.js';
import {
    CommonRequest,
    CommonResponse,
    IRouterConfig,
    MinimumRequest,
    OneApiResponse,
    PathMatchResult,
    PathObject,
    SessionData
} from '../types.js';

/**
 * Logger interface for OneAPI router.
 * Implement this to integrate with your logging framework.
 * If not provided, defaults to console methods.
 */
export interface OneApiLogger {
    debug?(message: string, ...args: any[]): void;

    info?(message: string, ...args: any[]): void;

    warn?(message: string, ...args: any[]): void;

    error?(message: string, ...args: any[]): void;
}

/**
 * Default logger using console methods.
 */
export const defaultLogger: OneApiLogger = {
    debug: console.debug.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
};

export interface GenericRouterConfig<CREDENTIALS = unknown, USER = unknown, SESSION = unknown> extends IRouterConfig<CREDENTIALS, USER, SESSION> {
    /**
     * If true, throws BadRequest when body parsing fails instead of continuing with null body.
     * @default false
     */
    strictBodyParsing?: boolean;

    /**
     * Logger for route execution logging.
     * Defaults to console methods. Pass `null` to disable logging entirely.
     */
    logger?: OneApiLogger | null;

    /**
     * If true, adds X-Matched-Route header to responses showing which template matched.
     * Helpful for debugging when wildcard routes catch unexpected requests.
     * @default true
     */
    includeMatchedRouteHeader?: boolean;

    /**
     * Log warnings when wildcard (*) or catch-all ([...]) routes match requests.
     * - true: always warn
     * - false: never warn
     * - 'once-per-route': warn once per unique actual URL (useful for production to catch unregistered routes)
     * @default false
     */
    wildcardWarning?: boolean | 'once-per-route';
}

function headersToEntries(headers: Record<string, string | string[]>): [string, string][] {
    const entries: [string, string][] = [];
    for (const [key, value] of Object.entries(headers)) {
        if (Array.isArray(value)) {
            value.forEach(v => entries.push([key, v]));
        } else {
            entries.push([key, value]);
        }
    }
    return entries;
}

export class GenericRouter<CREDENTIALS = unknown, USER = unknown, SESSION = unknown> {
    private routeCache = new Map<string, PathMatchResult>();
    private logger: OneApiLogger | null;
    /** Tracks URLs that have already been warned about for 'once-per-route' mode */
    private wildcardWarnedUrls = new Set<string>();

    constructor(
        private pathObject: PathObject,
        private config: GenericRouterConfig<CREDENTIALS, USER, SESSION> = {}
    ) {
        // Use provided logger, default to console, or null to disable
        this.logger = config.logger === null ? null : (config.logger ?? defaultLogger);
    }

    async handle(request: CommonRequest): Promise<CommonResponse> {
        const headersForResponse: Record<string, string | string[]> = {};

        try {
            const url = new URL(request.url);
            const pathname = this.config.pathPrefix && url.pathname.startsWith(this.config.pathPrefix)
                ? url.pathname.slice(this.config.pathPrefix.length)
                : url.pathname;

            const {
                params,
                handler,
                templatePath,
                isWildcardMatch
            } = getCachedMatch(this.routeCache, this.pathObject, pathname);

            this.logger?.debug?.(`${request.method} ${templatePath || pathname}`, {
                params,
                matched: !!handler,
                isWildcardMatch
            });

            if (!handler) {
                throw new NotFound();
            }

            // Add X-Matched-Route header for debugging (default: true)
            if (this.config.includeMatchedRouteHeader !== false) {
                headersForResponse['X-Matched-Route'] = templatePath;
                if (isWildcardMatch) {
                    headersForResponse['X-Wildcard-Match'] = 'true';
                }
            }

            // Log warning for wildcard matches if configured
            if (isWildcardMatch && this.config.wildcardWarning) {
                const shouldWarn = this.config.wildcardWarning === true ||
                    (this.config.wildcardWarning === 'once-per-route' && !this.wildcardWarnedUrls.has(pathname));

                if (shouldWarn) {
                    this.logger?.warn?.(
                        `[WILDCARD MATCH] ${request.method} ${pathname} matched via wildcard route "${templatePath}". ` +
                        `If this route should exist explicitly, register it in pathObject.`
                    );
                    if (this.config.wildcardWarning === 'once-per-route') {
                        this.wildcardWarnedUrls.add(pathname);
                    }
                }
            }

            const patchedResponse: OneApiResponse = new Response() as any;
            patchedResponse.setHeader = (k: string, v: string | string[]) => {
                headersForResponse[k] = v;
            };

            patchedResponse.getHeader = (k: string) => {
                return headersForResponse[k];
            };

            let session: SESSION | null = null;
            let user = null;

            if (this.config.authHandler) {
                const authResult = await this.config.authHandler.getSession(request as any, patchedResponse);
                if (authResult instanceof Response) return authResult;
                session = authResult;

                const userResult = await this.config.authHandler.getUser(request as any, patchedResponse);
                if (userResult instanceof Response) return userResult;
                user = userResult;
            }

            const query: Record<string, string> = {};
            url.searchParams.forEach((value, key) => {
                query[key] = value;
            });

            const shouldParseBody = handler.config?.parseBody !== false;
            let body: any = null;

            if (shouldParseBody && request.method !== 'GET' && request.method !== 'HEAD') {
                try {
                    const contentType = request.headers.get('content-type');
                    if (contentType?.includes('application/json')) {
                        body = await request.json();
                    } else if (contentType?.includes('multipart/form-data')) {
                        body = await request.formData();
                    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
                        const text = await request.text();
                        const searchParams = new URLSearchParams(text);
                        const formData: Record<string, string> = {};
                        searchParams.forEach((value, key) => {
                            formData[key] = value;
                        });
                        body = formData;
                    }
                } catch (e) {
                    if (this.config.strictBodyParsing) {
                        throw new BadRequest(`Failed to parse request body: ${e instanceof Error ? e.message : String(e)}`);
                    }
                    // Continue with null body if parsing fails
                }
            }

            const cookieHeader = request.headers.get('cookie') || '';
            const cookies = Object.fromEntries(
                cookieHeader.split(';').map(c => {
                    const [key, ...val] = c.trim().split('=');
                    return [key, val.join('=')];
                }).filter(([k]) => k)
            );

            const headers: Record<string, string> = {};
            request.headers.forEach((value, key) => {
                headers[key] = value;
            });

            const normalizedRequest: MinimumRequest = {
                query,
                body,
                method: request.method as any,
                headers,
                cookies,
                url: request.url,
                _request: request as any,
                _response: patchedResponse,
                _params: params
            };

            const sessionData: SessionData = {
                user,
                domain: request.headers.get('host'),
                api: await this.config.createApiImpl?.({
                    request: request,
                    session,
                    response: patchedResponse
                }),
                authHandler: this.config.authHandler,
                session
            };

            const response = await handler(sessionData, normalizedRequest, {});

            if (response instanceof Response) {
                return response;
            }

            return Response.json(response, {headers: headersToEntries(headersForResponse)});
        } catch (e) {
            return this.handleError(e, {headers: headersToEntries(headersForResponse)});
        }
    }

    private handleError(e: any, responseInitLike: any): CommonResponse {
        if (e instanceof UnAuthorised) {
            return Response.json({code: e.code, message: e.message}, {status: 401, ...responseInitLike});
        } else if (e instanceof Forbidden) {
            return Response.json({code: e.code, message: e.message}, {status: 403, ...responseInitLike});
        } else if (e instanceof NotFound) {
            return Response.json({code: e.code, message: e.message}, {status: 404, ...responseInitLike});
        } else if (e instanceof MethodNotAllowed) {
            return Response.json({code: e.code, message: e.message}, {status: 405, ...responseInitLike});
        } else if (e instanceof BadRequest) {
            return Response.json({code: e.code, message: e.message}, {status: 400, ...responseInitLike});
        } else if (e instanceof InternalServerError) {
            return Response.json({code: e.code, message: e.message}, {status: 500, ...responseInitLike});
        } else if (e instanceof Success) {
            return Response.json({
                code: e.code,
                message: e.message,
                payload: e.payload
            }, {status: 200, ...responseInitLike});
        } else if (e instanceof HttpException) {
            // HttpException uses code directly as HTTP status
            return Response.json({
                code: e.code,
                message: e.message,
                payload: e.payload
            }, {status: e.code, ...responseInitLike});
        } else if (e instanceof Exception) {
            // Generic Exception returns 503 - use HttpException for custom HTTP status codes
            return Response.json({
                code: e.code,
                message: e.message,
                payload: e.payload
            }, {status: 503, ...responseInitLike});
        } else {
            this.logger?.error?.("Unhandled error:", e);
            return Response.json({
                code: 500,
                message: `Internal Server Error: ${e instanceof Error ? e.message : String(e)}`
            }, {status: 500, ...responseInitLike});
        }
    }
}

export function createGenericRouter<CREDENTIALS = any, USER = any, SESSION = any>(pathObject: PathObject, config?: GenericRouterConfig<CREDENTIALS, USER, SESSION>) {
    return new GenericRouter<CREDENTIALS, USER, SESSION>(pathObject, config);
}