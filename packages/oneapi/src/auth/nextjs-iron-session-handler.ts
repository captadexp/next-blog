import {cookies} from "next/headers";
import {IronSessionAuthConfig, IronSessionAuthHandler, IronSessionData} from "./iron-session-handler";
import {getIronSession, IronSession} from "iron-session";
import {OneApiRequest, OneApiResponse} from "../types";


export class NextJsIronSessionHandler extends IronSessionAuthHandler {
    constructor(config: IronSessionAuthConfig) {
        super(config);
    }

    async getIronSession(req: OneApiRequest, res?: OneApiResponse | null): Promise<IronSession<IronSessionData>> {
        return getIronSession<IronSessionData>(await cookies(), this.sessionOptions)
    }
}
