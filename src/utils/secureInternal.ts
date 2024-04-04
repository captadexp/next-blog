import {headers} from "next/headers";
import {NextResponse} from "next/server";
import {CNextRequest} from "../types";
import crypto from "./crypto"

export default function secure<T>(fn: (request: CNextRequest) => T) {

    return async (request: CNextRequest) => {
        const headerList = headers()
        const [authMethod, authData] = headerList.get("authorization")?.split(" ") || [];

        const db = await request.db()

        if (request.configuration.byPassSecurity) {
            console.log("Security bypassed. This should be happening only if you are creating the first author")
            return fn(request)
        }

        if (authMethod !== 'Basic')
            return notAllowed()

        const decoded = Buffer.from(authData, 'base64').toString()
        const [username, password] = decoded.split(':')

        const user = await db.authors.findOne({username})
        if (!user) return notAllowed()

        if (!(crypto.comparePassword(password, user.password)))
            return notAllowed();

        (request as any).sessionUser = user;

        console.log("access given to", user.username)

        return fn(request)
    }
}

function notAllowed() {
    return new NextResponse(null, {
        status: 401,
        headers: {'WWW-Authenticate': 'Basic realm="Protected Page"'}
    })
}
