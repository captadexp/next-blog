import {headers} from "next/headers";
import {NextResponse} from "next/server";
import {CNextRequest} from "../index";

export default function secure<T>(fn: (request: CNextRequest) => T) {

    return (request: CNextRequest) => {
        const headerList = headers()
        const [authMethod, authData] = headerList.get("authorization")?.split(" ") || [];
        if (authMethod === 'Basic') {
            const decoded = Buffer.from(authData, 'base64').toString()
            const [username, password] = decoded.split(':')

            if (username === "username" && password === "password") {
                console.log("access given")
            } else {
                return new NextResponse(null, {
                    status: 401,
                    headers: {'WWW-Authenticate': 'Basic realm="Protected Page"'}
                });
            }

        } else {
            return new NextResponse(null, {status: 401, headers: {'WWW-Authenticate': 'Basic realm="Protected Page"'}});
        }

        return fn(request)
    }
}
