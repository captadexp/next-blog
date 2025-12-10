import {getCachedMatch} from '../parse-path.js';
import {
    BadRequest,
    Exception,
    Forbidden,
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

export interface GenericRouterConfig<CREDENTIALS = unknown, USER = unknown, SESSION = unknown> extends IRouterConfig<CREDENTIALS, USER, SESSION> {
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

    constructor(
        private pathObject: PathObject,
        private config: GenericRouterConfig<CREDENTIALS, USER, SESSION> = {}
    ) {
    }

    async handle(request: CommonRequest): Promise<CommonResponse> {
        const headersForResponse: Record<string, string | string[]> = {};

        try {
            const url = new URL(request.url);
            const pathname = this.config.pathPrefix && url.pathname.startsWith(this.config.pathPrefix)
                ? url.pathname.slice(this.config.pathPrefix.length)
                : url.pathname;

            const {params, handler, templatePath} = getCachedMatch(this.routeCache, this.pathObject, pathname);

            console.log("Generic =>", request.method, templatePath, params, "executing:", !!handler);

            if (!handler) {
                throw new NotFound();
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
                } catch {
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
        } else if (e instanceof Exception) {
            return Response.json({code: e.code, message: e.message}, {status: 503, ...responseInitLike});
        } else {
            console.error("Unhandled error:", e);
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