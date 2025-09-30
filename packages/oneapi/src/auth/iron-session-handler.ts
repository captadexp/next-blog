import {IronSession, SessionOptions} from 'iron-session';
import {AuthResult, IAuthHandler} from './auth-handler';
import {OneApiRequest, OneApiResponse} from "../types";

/**
 * Session data structure for iron-session
 */
export interface IronSessionData {
    user?: any;

    [key: string]: any;
}

/**
 * Configuration for IronSessionAuthHandler
 */
export interface IronSessionAuthConfig {
    password: string;
    cookieName: string;
    cookieOptions?: {
        secure?: boolean;
        httpOnly?: boolean;
        sameSite?: 'lax' | 'strict' | 'none';
        maxAge?: number;
        domain?: string;
        path?: string;
    };
    /**
     * Optional function to validate credentials and return user object
     * If not provided, login will store credentials directly as user
     */
    validateCredentials?: (credentials: any) => Promise<any | null>;
}


/**
 * Iron-session based authentication handler
 * Uses encrypted cookies to store session data
 */
export abstract class IronSessionAuthHandler implements IAuthHandler {
    protected readonly sessionOptions: SessionOptions;
    private readonly validateCredentials?: (credentials: any) => Promise<any | null>;

    protected constructor(config: IronSessionAuthConfig) {
        this.sessionOptions = {
            password: config.password,
            cookieName: config.cookieName,
            cookieOptions: {
                secure: config.cookieOptions?.secure ?? process.env.NODE_ENV === 'production',
                httpOnly: config.cookieOptions?.httpOnly ?? true,
                sameSite: config.cookieOptions?.sameSite ?? 'lax',
                maxAge: config.cookieOptions?.maxAge,
                domain: config.cookieOptions?.domain,
                path: config.cookieOptions?.path ?? '/',
            }
        };

        this.validateCredentials = config.validateCredentials;
    }

    /**
     * Get iron-session instance based on request type
     */
    abstract getIronSession(req: OneApiRequest, res?: OneApiResponse | null): Promise<IronSession<IronSessionData>>

    /**
     * Authenticate user with credentials
     */
    async login(
        credentials: any,
        req: OneApiRequest,
        res?: OneApiResponse | null
    ): Promise<AuthResult> {
        try {
            const session = await this.getIronSession(req, res);

            // Validate credentials if validator is provided
            let user: any;
            if (this.validateCredentials) {
                user = await this.validateCredentials(credentials);
                if (!user) {
                    return {
                        success: false,
                        error: 'Invalid credentials'
                    };
                }
            } else {
                // Store credentials directly as user if no validator
                user = credentials;
            }

            // Store user in session
            session.user = user;
            await session.save();

            return {
                success: true,
                user
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Authentication failed'
            };
        }
    }

    /**
     * Logout current user
     */
    async logout(
        req: OneApiRequest,
        res?: OneApiResponse | null
    ): Promise<void> {
        const session = await this.getIronSession(req, res);
        session.destroy();
    }

    /**
     * Get current authenticated user
     */
    async getUser(
        req: OneApiRequest,
        res?: OneApiResponse | null
    ): Promise<any | null> {
        const session = await this.getIronSession(req, res);
        return session.user || null;
    }

    /**
     * Check if user is authenticated
     */
    async isAuthenticated(
        req: OneApiRequest,
        res?: OneApiResponse | null
    ): Promise<boolean> {
        const session = await this.getIronSession(req, res);
        return !!session.user;
    }

    /**
     * Update user data in session
     */
    async updateUser(
        user: any,
        req: OneApiRequest,
        res?: OneApiResponse | null
    ): Promise<void> {
        const session = await this.getIronSession(req, res);
        session.user = user;
        await session.save();
    }

    /**
     * Get the session object
     */
    async getSession(
        req: OneApiRequest,
        res?: OneApiResponse | null
    ): Promise<IronSession<IronSessionData>> {
        return this.getIronSession(req, res);
    }

    /**
     * Set arbitrary session data
     */
    async setSessionData(
        key: string,
        value: any,
        req: OneApiRequest,
        res?: OneApiResponse | null
    ): Promise<void> {
        const session = await this.getIronSession(req, res);
        session[key] = value;
        await session.save();
    }

    /**
     * Get arbitrary session data
     */
    async getSessionData(
        key: string,
        req: OneApiRequest,
        res?: OneApiResponse | null
    ): Promise<any> {
        const session = await this.getIronSession(req, res);
        return session[key];
    }
}