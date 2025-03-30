import {Configuration} from "./types";
import {NextRequest, NextResponse} from "next/server";
import {matchPathToFunction, PathObject} from "./utils/parse-path";
import cmsPaths from "./cmsPaths";
import {NotFoundPage} from "@supergrowthai/next-blog-dashboard/server"
import {
    Exception,
    BadRequest,
    NotFound,
    Unauthorized,
    Forbidden,
    Success
} from "./utils/errors";

//hello
/**
 * Return type for the nextBlog function containing route handlers
 */
export interface NextBlogHandlers {
    GET: (request: NextRequest, response: NextResponse) => Promise<NextResponse | Response>;
    POST: (request: NextRequest, response: NextResponse) => Promise<NextResponse | Response>;
}

/**
 * Main CMS function that creates the API route handlers
 */
const nextBlog = function (configuration: Configuration): NextBlogHandlers {
    async function processRequest(pathObject: PathObject, request: NextRequest, _response: NextResponse) {
        try {
            const finalPathname = request.nextUrl.pathname.replace("/api/next-blog/", "")
            const {db} = configuration
            const {
                params,
                handler,
                templatePath
            } = matchPathToFunction(pathObject, finalPathname)

            console.log("=>", request.method, templatePath, params, "executing:", !!handler)

            if (!handler) {
                throw new NotFound("Resource not found");
            }

            (request as any)._params = params;
            (request as any).db = db;
            (request as any).configuration = configuration;

            // Check if the path appears to be an API endpoint
            const isApiRequest = finalPathname.startsWith("api/");

            try {
                const response = await handler(request);

                // If the handler returns a Response or NextResponse, return it directly
                if (response instanceof NextResponse || response instanceof Response) {
                    return response;
                }

                // If the handler returns a string
                if (typeof response === "string") {
                    if (isApiRequest) {
                        // For API endpoints, assume it's JSON and set content type
                        return new NextResponse(response, {headers: {"Content-Type": "application/json"}});
                    } else {
                        // For non-API endpoints, assume it's HTML
                        return new NextResponse(response, {headers: {"Content-Type": "text/html"}});
                    }
                }

                // If it's an API request but no proper response, treat as error
                if (isApiRequest) {
                    throw new Exception("Invalid API response format");
                }

                // Default to NotFound page for non-API routes
                return new NextResponse(NotFoundPage.toString(), {headers: {"Content-Type": "text/html"}});
            } catch (error) {
                // Let error bubble up to be handled by the outer try-catch
                throw error;
            }
        } catch (e) {
            // Handle different types of errors with appropriate responses
            if (e instanceof Unauthorized) {
                return NextResponse.json({
                    code: e.code,
                    message: e.message
                }, {status: 401});
            } else if (e instanceof Forbidden) {
                return NextResponse.json({
                    code: e.code,
                    message: e.message
                }, {status: 403});
            } else if (e instanceof NotFound) {
                // Check if it's an API request based on URL pattern
                if (request.nextUrl.pathname.includes("/api/")) {
                    return NextResponse.json({
                        code: e.code,
                        message: e.message
                    }, {status: 404});
                } else {
                    // For non-API routes, show the NotFound page
                    return new NextResponse(NotFoundPage.toString(), {
                        headers: {"Content-Type": "text/html"},
                        status: 404
                    });
                }
            } else if (e instanceof BadRequest) {
                return NextResponse.json({
                    code: e.code,
                    message: e.message
                }, {status: 400});
            } else if (e instanceof Success) {
                return NextResponse.json({
                    code: e.code,
                    message: e.message,
                    payload: e.payload
                }, {status: 200});
            } else if (e instanceof Exception) {
                const httpCode = e.code >= 100 && e.code < 600 ? e.code : 500;
                return NextResponse.json({
                    code: e.code,
                    message: e.message
                }, {status: httpCode});
            } else {
                // Unhandled errors
                console.error("Unhandled error:", e);
                return NextResponse.json({
                    code: 500,
                    message: `Internal Server Error: ${e instanceof Error ? e.message : String(e)}`
                }, {status: 500});
            }
        }
    }

    async function GET(request: NextRequest, response: NextResponse) {
        return processRequest(cmsPaths.GET, request, response)
    }

    async function POST(request: NextRequest, response: NextResponse) {
        return processRequest(cmsPaths.POST, request, response)
    }

    return {GET, POST}
};

export default nextBlog;

// Export types, utilities, and components for external use
export * from './exports';