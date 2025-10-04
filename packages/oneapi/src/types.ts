import type {IAuthHandler} from './auth/auth-handler';
import {NextRequest, NextResponse} from "next/server";
import {Request, Response as ExpressResponse} from "express";

export type OneApiRequest = NextRequest | Request
export type OneApiResponse = (NextResponse | ExpressResponse) & { setHeader(key: string, value: string): void };

export interface MinimumRequest<HEADERS = any, BODY = any, QUERY = any> {
    query: QUERY;
    body: BODY;
    method: 'POST' | 'GET' | 'DELETE' | 'OPTIONS' | 'PUT' | 'PATCH' | 'HEAD';
    headers: HEADERS;
    cookies?: any;
    url: string;
    _response?: OneApiResponse;
    _request?: OneApiRequest;
    _params?: Record<string, string>;
}

export interface SessionData {
    user?: any;
    domain?: string | null;
    api?: any;
    authHandler?: IAuthHandler;
    session?: any;
}

// Configuration for OneAPI functions
export interface OneApiFunctionConfig {
    parseBody?: boolean; // Whether to parse request body (default: true)
    maxBodySize?: number; // Maximum body size in bytes (optional)
}

// Support both standard OneApiFunctionResponse and raw Response objects (for static files, etc)
export type OneApiFunction<EXTRA = any, HEADERS = any, BODY = any, QUERY = any, RPayload = any> = {
    (
        session: SessionData,
        request: MinimumRequest<HEADERS, BODY, QUERY>,
        extra: EXTRA
    ): Promise<OneApiFunctionResponse<RPayload> | Response | NextResponse>;
    config?: OneApiFunctionConfig;
};

export interface OneApiFunctionResponse<T = any> {
    code: number;
    message: string;
    payload?: T;
}

export type PathMatchResult = {
    handler: OneApiFunction | null;
    templatePath: string;
    params: Record<string, string>;
};

export type PathObject = { [key: string]: PathObject | OneApiFunction };

type APIImpl = {}
type APIImplConfig = { request: OneApiRequest, response?: OneApiResponse, session?: SessionData | null };

export interface IRouterConfig {
    createApiImpl?: (config: APIImplConfig) => Promise<APIImpl>;
    pathPrefix?: string;
    authHandler?: IAuthHandler;
}