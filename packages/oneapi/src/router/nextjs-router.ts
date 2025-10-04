import {getCachedMatch} from '../parse-path';
import {BadRequest, Exception, Forbidden, NotFound, Success, UnAuthorised} from '../errors';
import {IRouterConfig, MinimumRequest, OneApiResponse, PathObject, SessionData} from '../types';
import {cookies} from "next/headers";
import {NextRequest, NextResponse} from "next/server";


export interface NextJSRouterConfig extends IRouterConfig {
}

/**
 * Next.js App Router specific implementation
 */
export class NextJSRouter {
    constructor(
        private pathObject: PathObject,
        private config: NextJSRouterConfig = {}
    ) {
    }

    /**
     * Creates Next.js App Router handlers for all HTTP methods
     */
    handlers() {
        const processRequestInternal = async (request: NextRequest) => {
            try {
                const pathPrefix = this.config.pathPrefix;
                const finalPathname = pathPrefix ? request.nextUrl.pathname.replace(pathPrefix, "") : request.nextUrl.pathname;

                const {params, handler, templatePath} = getCachedMatch(this.pathObject, finalPathname);

                console.log("NextJS =>", request.method, templatePath, params, "executing:", !!handler);

                if (!handler) {
                    throw new NotFound();
                }

                const headersForResponse: Record<string, string> = {};
                const patchedResponse: OneApiResponse = new NextResponse() as any;
                patchedResponse.setHeader = (k: string, v: string) => {
                    headersForResponse[k] = v;
                };

                // --- helper: unwrap optional early Response from auth methods
                const runAuthStep = async <T>(fn?: (req: NextRequest, res: OneApiResponse) => Promise<T | Response | NextResponse>) => {
                    if (!fn) return {value: null as unknown as T};
                    const out = await fn(request, patchedResponse);
                    if (out instanceof NextResponse || out instanceof Response) {
                        return {response: out as Response};
                    }
                    return {value: out as T};
                };

                // Get session if getSession is provided
                let session = null;
                let user = null;

                if (this.config.authHandler) {
                    const s = await runAuthStep(this.config.authHandler.getSession.bind(this.config.authHandler));
                    if (s.response) return s.response;
                    session = s.value;

                    const u = await runAuthStep(this.config.authHandler.getUser.bind(this.config.authHandler));
                    if (u.response) return u.response;
                    user = u.value;
                }

                // Create normalized request
                const url = new URL(request.url);
                const query = Object.fromEntries(url.searchParams.entries());

                // Check if handler wants raw body (no parsing)
                const shouldParseBody = handler.config?.parseBody !== false;

                let body: any = null;

                if (shouldParseBody) {
                    try {
                        if (request.method !== 'GET' && request.method !== 'HEAD') {
                            const contentType = request.headers.get('content-type');
                            if (contentType?.includes('application/json')) {
                                body = await request.json();
                            } else if (contentType?.includes('multipart/form-data')) {
                                /*
                                (property) BodyMixin.formData: () => Promise<FormData>
                                @deprecated — This method is not recommended for parsing multipart/form-data bodies in server environments. It is recommended to use a library such as @fastify/busboy   as follows:
                                @example
                                import { Busboy } from '@fastify/busboy'
                                import { Readable } from 'node:stream'
                                const response = await fetch('...')
                                const busboy = new Busboy({ headers: { 'content-type': response.headers.get('content-type') } })
                                // handle events emitted from `busboy`
                                Readable.fromWeb(response.body).pipe(busboy)
                                */
                                body = await request.formData();
                            } else if (contentType?.includes('application/x-www-form-urlencoded')) {
                                const text = await request.text();
                                body = Object.fromEntries(new URLSearchParams(text));
                            }
                        }
                    } catch {
                        // If body parsing fails, continue with empty body
                    }
                }

                const cookiesObj = (await cookies())
                    .getAll()
                    .reduce((acc, {name, value}) => {
                        acc[name] = value;
                        return acc;
                    }, {} as Record<string, string>);

                const headersObj: Record<string, string> = {}
                // Convert Headers to object
                request.headers.forEach((value, key) => {
                    headersObj[key] = value;
                });

                const normalizedRequest: MinimumRequest = {
                    query,
                    body,
                    method: request.method as any,
                    headers: headersObj,
                    cookies: cookiesObj,
                    url: request.url,
                    _request: request,
                    _response: patchedResponse,
                    _params: params
                };

                // Create session data
                const sessionData: SessionData = {
                    user,
                    domain: request.headers.get('host'),
                    api: await this.config.createApiImpl?.({request, session, response: patchedResponse}) || null,
                    authHandler: this.config.authHandler,
                    session
                };

                // Call the handler
                const response = await handler(
                    sessionData,
                    normalizedRequest,
                    {}
                );

                //find a better way to check if its a class object
                if (response instanceof NextResponse || response instanceof Response) {
                    return response;
                }

                if ('code' in response && 'message' in response) {
                    const httpStatus = this.getHttpStatus(response.code);
                    return NextResponse.json(response, {status: httpStatus, headers: headersForResponse});
                }

                return NextResponse.json(response, {headers: headersForResponse});

            } catch (e) {
                return this.handleError(e, request);
            }
        };

        const processRequest = async (request: NextRequest) => {
            // Process request directly without context
            return processRequestInternal(request);
        }

        return {
            GET: (request: NextRequest) => processRequest(request),
            HEAD: (request: NextRequest) => processRequest(request),
            POST: (request: NextRequest) => processRequest(request),
            PUT: (request: NextRequest) => processRequest(request),
            DELETE: (request: NextRequest) => processRequest(request),
            PATCH: (request: NextRequest) => processRequest(request),
            OPTIONS: (request: NextRequest) => processRequest(request),
        };
    }

    private getHttpStatus(code: number): number {
        // Standard HTTP status codes
        if (code === 0) return 200; // Success
        if (code >= 100 && code < 600) return code; // Valid HTTP status
        if (code < 0) return 200; // Application success codes
        return 500; // Default to internal server error
    }

    private handleError(e: any, request: NextRequest) {
        if (e instanceof UnAuthorised) {
            return NextResponse.json({
                code: e.code,
                message: e.message
            }, {status: 401});
        } else if (e instanceof Forbidden) {
            return NextResponse.json({
                code: e.code,
                message: e.message
            }, {status: 403});
        } else if (e instanceof NotFound) {
            if (request.nextUrl.pathname.includes("/api/")) {
                return NextResponse.json({
                    code: e.code,
                    message: e.message
                }, {status: 404});
            } else {
                return new NextResponse("404 - Not Found", {
                    headers: {"Content-Type": "text/html"},
                    status: 404
                });
            }
        } else if (e instanceof BadRequest) {
            return NextResponse.json({
                code: e.code,
                message: e.message
            }, {status: 400});
        } else if (e instanceof Success) {
            return NextResponse.json({
                code: e.code,
                message: e.message,
                payload: e.payload
            }, {status: 200});
        } else if (e instanceof Exception) {
            const httpCode = this.getHttpStatus(e.code);
            return NextResponse.json({
                code: e.code,
                message: e.message
            }, {status: httpCode});
        } else {
            console.error("Unhandled error:", e);
            return NextResponse.json({
                code: 500,
                message: `Internal Server Error: ${e instanceof Error ? e.message : String(e)}`
            }, {status: 500});
        }
    }
}

/**
 * Factory function to create Next.js router
 */
export function createNextJSRouter(pathObject: PathObject, config?: NextJSRouterConfig) {
    return new NextJSRouter(pathObject, config);
}

