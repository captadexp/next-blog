import type {MinimumRequest, OneApiFunction} from "@supergrowthai/oneapi";
import type {Permission} from "@supergrowthai/next-blog-types/server";
import {hasAllPermissions, hasAnyPermission, hasPermission} from "./permissions.js";
import {Session} from "../auth/sessions.ts";
import type {ApiExtra} from "../types/api.ts";
import {SessionAuthHandler} from "../auth/SessionAuthHandler.ts";
import {BasicAuthHandler} from "../auth/basic-auth-handler.ts";

type SecureOptions = {
    requirePermission?: Permission;
    requireAnyPermission?: Permission[];
    requireAllPermissions?: Permission[];
};

/**
 * Wrapper to secure an oneapi endpoint with permission checking
 * This is now a wrapper around OneApiFunction to add permission checking
 *
 * @param fn The oneapi handler function to secure
 * @param options Optional configuration for permission requirements
 * @returns A wrapped oneapi function that checks permissions before executing
 */
export function secure(
    fn: OneApiFunction<ApiExtra>,
    options?: SecureOptions
): OneApiFunction {
    const wrappedFn: OneApiFunction = async (session, request, extra) => {
        // Check if user is authenticated
        if (!session.user) {
            return {
                code: 401,
                message: "Authentication required"
            };
        }

        // Check permissions if required
        if (options?.requirePermission) {
            if (!hasPermission(session.user, options.requirePermission)) {
                return {
                    code: 403,
                    message: `Insufficient permissions. Required: ${options.requirePermission}`
                };
            }
        }

        if (options?.requireAnyPermission && options.requireAnyPermission.length > 0) {
            if (!hasAnyPermission(session.user, options.requireAnyPermission)) {
                return {
                    code: 403,
                    message: `Insufficient permissions. Required any of: ${options.requireAnyPermission.join(', ')}`
                };
            }
        }

        if (options?.requireAllPermissions && options.requireAllPermissions.length > 0) {
            if (!hasAllPermissions(session.user, options.requireAllPermissions)) {
                return {
                    code: 403,
                    message: `Insufficient permissions. Required all of: ${options.requireAllPermissions.join(', ')}`
                };
            }
        }

        // All permission checks passed, execute the original function
        return fn(session, request, extra);
    };

    // Copy all properties from original function to wrapped function
    Object.assign(wrappedFn, fn);

    return wrappedFn;
}

const CSRF_HEADER = "x-csrf-token";
const CSRF_COOKIE = "csrf";
const UNSAFE = new Set<MinimumRequest["method"]>(["POST", "PUT", "PATCH", "DELETE", "GET"]);

function getHeader(req: MinimumRequest, name: string) {
    const h = req.headers;
    const key = Object.keys(h).find(k => k.toLowerCase() === name.toLowerCase());
    return key ? h[key] : undefined;
}

function getCookie(req: MinimumRequest, name: string): string | undefined {
    return req.cookies[name];
}

export function securePlus(
    fn: OneApiFunction,
    options?: SecureOptions
): OneApiFunction {
    const wrapped: OneApiFunction = async (session, request, extra) => {
        // 1) Auth required
        if (!session.user) {
            return {code: 401, message: "Authentication required"};
        }

        // 2) CSRF for unsafe methods (double-submit: header must equal cookie)
        if (UNSAFE.has(request.method)) {
            const headerToken = getHeader(request, CSRF_HEADER);
            const cookieToken = getCookie(request, CSRF_COOKIE);
            const sessionToken = (session.session as Session).csrf

            if (!headerToken || !cookieToken || !sessionToken) {
                return {code: 403, message: "Missing CSRF token"};
            }
            if (headerToken !== cookieToken || headerToken !== sessionToken) {
                return {code: 403, message: "Invalid CSRF token"};
            }
        }

        // 3) Permission checks (same semantics as your original)
        if (options?.requirePermission) {
            if (!hasPermission(session.user, options.requirePermission)) {
                return {code: 403, message: `Insufficient permissions. Required: ${options.requirePermission}`};
            }
        }

        if (options?.requireAnyPermission?.length) {
            if (!hasAnyPermission(session.user, options.requireAnyPermission)) {
                return {
                    code: 403,
                    message: `Insufficient permissions. Required any of: ${options.requireAnyPermission.join(", ")}`
                };
            }
        }

        if (options?.requireAllPermissions?.length) {
            if (!hasAllPermissions(session.user, options.requireAllPermissions)) {
                return {
                    code: 403,
                    message: `Insufficient permissions. Required all of: ${options.requireAllPermissions.join(", ")}`
                };
            }
        }

        // 4) All good
        return fn(session, request, extra);
    };

    Object.assign(wrapped, fn);
    return wrapped;
}

export function smartSecure(
    fn: OneApiFunction,
    options?: SecureOptions
): OneApiFunction {
    const wrappedFn: OneApiFunction = async (session, request, extra) => {
        if (session.authHandler instanceof SessionAuthHandler) {
            return securePlus(fn, options)(session, request, extra);
        } else if (session.authHandler instanceof BasicAuthHandler) {
            return secure(fn, options)(session, request, extra);
        } else
            throw new Error("Unsupported auth handler");
    };

    Object.assign(wrappedFn, fn);

    return wrappedFn;
}


export default smartSecure