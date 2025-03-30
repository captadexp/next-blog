import {headers} from "next/headers";
import {NextResponse} from "next/server";
import {CNextRequest, Permission, User} from "../types";
import crypto from "./crypto";
import {hasPermission, hasAnyPermission} from "./permissions";

type SecureOptions = {
    requirePermission?: Permission;
    requireAnyPermission?: Permission[];
};

/**
 * Middleware to secure an endpoint with authentication and optional permission checking
 * @param fn The handler function to secure
 * @param options Optional configuration for permission requirements
 */
export default function secure<T>(
    fn: (request: CNextRequest) => T,
    options?: SecureOptions
) {
    return async (request: CNextRequest) => {
        const headerList = await headers()
        const [authMethod, authData] = headerList.get("authorization")?.split(" ") || [];

        const db = await request.db()

        // Check if there are any users
        const hasUser = await db.users.findOne({}).then(u => !!u);

        if (!hasUser)
            console.log("Disabling Security! As there are no Users")

        request.configuration.byPassSecurity = !hasUser || request.configuration.byPassSecurity;

        if (request.configuration.byPassSecurity) {
            console.log("Security bypassed. This should be happening only if you are creating the first user")
            return fn(request)
        }

        if (authMethod !== 'Basic')
            return notAllowed("Authentication required")

        const decoded = Buffer.from(authData, 'base64').toString()
        const [username, password] = decoded.split(':')

        // Find user with the provided username
        let user: User | null = await db.users.findOne({username});

        if (!user) {
            // If no user was found, return not allowed
            return notAllowed("Invalid credentials");
        }

        // Verify password
        if (!(crypto.comparePassword(password, user.password))) {
            return notAllowed("Invalid credentials");
        }

        // User is authenticated - assign to request
        (request as any).sessionUser = user;

        // Check permissions if required
        if (options?.requirePermission) {
            if (!hasPermission(user, options.requirePermission)) {
                return notAllowed(
                    `Insufficient permissions. Required: ${options.requirePermission}`
                );
            }
        }

        if (options?.requireAnyPermission && options.requireAnyPermission.length > 0) {
            if (!hasAnyPermission(user, options.requireAnyPermission)) {
                return notAllowed(
                    `Insufficient permissions. Required any of: ${options.requireAnyPermission.join(', ')}`
                );
            }
        }

        console.log("User access given to", user.username);
        return fn(request);
    }
}

function notAllowed(message: string = "Unauthorized") {
    return new NextResponse(
        JSON.stringify({
            error: "Unauthorized",
            message: message
        }),
        {
            status: 401,
            headers: {
                'WWW-Authenticate': 'Basic realm="Protected Page"',
                'Content-Type': 'application/json'
            }
        }
    );
}
