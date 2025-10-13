export type OneApiRequest = Request & { [key: string]: any };
export type OneApiResponse = Response & { setHeader(key: string, value: string): void };

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
    ): Promise<OneApiFunctionResponse<RPayload> | Response>;
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

/**
 * Authentication result returned from login methods
 */
export interface AuthResult {
    success: boolean;
    user?: any;
    error?: string;
}

/**
 * Base authentication handler interface
 * Implementations can use different strategies (cookies, JWT, OAuth, etc.)
 */
export interface IAuthHandler {
    /**
     * Authenticate user with credentials
     */
    login(credentials: any, req: OneApiRequest, res?: OneApiResponse | null): Promise<AuthResult>;

    /**
     * Logout current user
     */
    logout(req: OneApiRequest, res?: OneApiResponse | null): Promise<void>;

    /**
     * Get current authenticated user
     */
    getUser(req: OneApiRequest, res?: OneApiResponse | null): Promise<any | null>;

    /**
     * Check if user is authenticated
     */
    isAuthenticated(req: OneApiRequest, res?: OneApiResponse | null): Promise<boolean>;

    /**
     * Update user data in session
     */
    updateUser(user: any, req: OneApiRequest, res?: OneApiResponse | null): Promise<void>;

    /**
     * Get the session object (implementation specific)
     */
    getSession(req: OneApiRequest, res?: OneApiResponse | null): Promise<any>;
}