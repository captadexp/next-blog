export type CommonRequest = Request;
export type CommonResponse = Response;

export type OneApiRequest = CommonRequest;

export type OneApiResponse = CommonResponse & {
    setHeader(key: string, value: string | number | readonly string[]): void;
    getHeader(key: string): string | number | string[] | undefined;
};

type HeaderMap = Record<string, string>;
type QueryValue = string | undefined;

export interface MinimumRequest<
    HEADERS extends HeaderMap = HeaderMap,
    BODY = any,
    QUERY extends Record<string, QueryValue> = Record<string, QueryValue>
> {
    query: QUERY;
    body: BODY;
    method: 'POST' | 'GET' | 'DELETE' | 'OPTIONS' | 'PUT' | 'PATCH' | 'HEAD';
    headers: HEADERS;
    cookies: Record<string, string>;
    url: string;
    _response?: OneApiResponse;
    _request?: OneApiRequest;
    _params?: Record<string, string>;
}

export interface SessionData<USER = any, SESSION = any> {
    user?: USER;
    domain?: string | null;
    api?: APIImpl;
    authHandler?: IAuthHandler<any, USER, SESSION>;
    session?: SESSION;
}

export interface OneApiFunctionConfig {
    parseBody?: boolean;
    maxBodySize?: number;
}

export interface OneApiFunctionResponse<T = unknown> {
    code: number;
    message: string;
    payload?: T;
}

// available for augmentation
export interface APIImpl {
} // use interface for declaration merging

type APIImplConfig<SESSION = unknown> = {
    request: OneApiRequest;
    response?: OneApiResponse;
    session?: SESSION | null;
};

export type OneApiFunction<
    EXTRA = any,
    HEADERS extends HeaderMap = HeaderMap,
    BODY = any,
    QUERY extends Record<string, QueryValue> = Record<string, QueryValue>,
    RPayload = any,
    SESSION_DATA extends SessionData<any, any> = SessionData<any, any>,
> = {
    (
        session: SESSION_DATA,
        request: MinimumRequest<HEADERS, BODY, QUERY>,
        extra: EXTRA
    ): Promise<OneApiFunctionResponse<RPayload> | CommonResponse>;
    config?: OneApiFunctionConfig;
};

export type PathMatchResult = {
    handler: OneApiFunction | null;
    templatePath: string;
    params: Record<string, string>;
};

export type PathObject = { [key: string]: PathObject | OneApiFunction };

export interface IRouterConfig<CREDENTIALS = unknown, USER = unknown, SESSION = unknown> {
    createApiImpl?: (config: APIImplConfig<SESSION>) => Promise<APIImpl>;
    pathPrefix?: string;
    authHandler?: IAuthHandler<CREDENTIALS, USER, SESSION>;
}

export type AuthResult<T> =
    | { success: false; error: string }
    | { success: true; user: T };

export interface IAuthHandler<CREDENTIALS, USER, SESSION> {
    login(credentials: CREDENTIALS, req: OneApiRequest, res?: OneApiResponse | null): Promise<AuthResult<USER>>;

    logout(req: OneApiRequest, res?: OneApiResponse | null): Promise<void>;

    getUser(req: OneApiRequest, res?: OneApiResponse | null): Promise<USER | null>;

    isAuthenticated(req: OneApiRequest, res?: OneApiResponse | null): Promise<boolean>;

    updateUser(user: USER, req: OneApiRequest, res?: OneApiResponse | null): Promise<void>;

    getSession(req: OneApiRequest, res?: OneApiResponse | null): Promise<SESSION>;
}
