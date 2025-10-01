import type {MinimumRequest, OneApiFunction, OneApiFunctionResponse, SessionData} from "@supergrowthai/oneapi/types";
import type {Permission} from "@supergrowthai/types/server";
import {hasAllPermissions, hasAnyPermission, hasPermission} from "./permissions.js";

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
export default function secure(
    fn: OneApiFunction,
    options?: SecureOptions
): OneApiFunction {
    return async (session: SessionData, request: MinimumRequest, extra: any) => {
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
}