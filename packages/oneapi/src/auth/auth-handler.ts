import {OneApiRequest, OneApiResponse} from "../types";

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