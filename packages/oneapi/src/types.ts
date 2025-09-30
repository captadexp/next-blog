import type {IAuthHandler} from './auth/auth-handler';
import {NextRequest, NextResponse} from "next/server";
import {Request, Response} from "express";

export type OneApiRequest = NextRequest | Request
export type OneApiResponse = (NextResponse | Response) & { setHeader(key: string, value: string): void };

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

export type OneApiFunction<EXTRA = any, HEADERS = any, BODY = any, QUERY = any, RPayload = any> = (
    session: SessionData,
    request: MinimumRequest<HEADERS, BODY, QUERY>,
    extra: EXTRA
) => Promise<OneApiFunctionResponse<RPayload>>;

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
    createApiImpl?: (config: APIImplConfig) => APIImpl;
    pathPrefix?: string;
    authHandler?: IAuthHandler;
}