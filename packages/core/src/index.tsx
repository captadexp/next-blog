import {Configuration} from "./types";
import {NextRequest, NextResponse} from "next/server";
import NotFound from "./components/NotFound";
import {matchPathToFunction, PathObject} from "./utils/parse-path";
import cmsPaths from "./cmsPaths";
import {renderToString} from 'preact-render-to-string'

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
        const finalPathname = request.nextUrl.pathname.replace("/api/next-blog/", "")
        const {db} = configuration
        const {
            params,
            handler,
            templatePath
        } = matchPathToFunction(pathObject, finalPathname)

        console.log("=>", request.method, templatePath, params, "executing:", !!handler)

        if (!handler) {
            const response = renderToString(<NotFound/>)
            return new NextResponse(response, {headers: {"Content-Type": "text/html"}})
        }

        (request as any)._params = params;
        (request as any).db = db;
        (request as any).configuration = configuration;

        const response = await handler(request);

        if (response instanceof NextResponse || response instanceof Response)
            return response;

        if (typeof response === "string") {
            return new NextResponse(response, {headers: {"Content-Type": "text/html"}});
        }

        return new NextResponse(renderToString(response), {headers: {"Content-Type": "text/html"}});
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