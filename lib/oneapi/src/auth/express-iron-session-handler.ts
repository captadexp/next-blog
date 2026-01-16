import {IronSessionAuthConfig, IronSessionAuthHandler, IronSessionData} from "./iron-session-handler";
import {getIronSession, IronSession} from "iron-session";
import {OneApiRequest, OneApiResponse} from "../types";


export class ExpressIronSessionHandler extends IronSessionAuthHandler {
    constructor(config: IronSessionAuthConfig) {
        super(config);
    }

    async getIronSession(req: OneApiRequest, res?: OneApiResponse | null): Promise<IronSession<IronSessionData>> {
        if (!res) {
            throw new Error('ExpressIronSessionHandler requires a response object. Ensure the router is providing the response to auth handlers.');
        }
        return getIronSession<IronSessionData>(req, res, this.sessionOptions);
    }
}
