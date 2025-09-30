import {IronSessionAuthConfig, IronSessionAuthHandler, IronSessionData} from "./iron-session-handler";
import {getIronSession, IronSession} from "iron-session";
import {OneApiRequest, OneApiResponse} from "../types";


export class ExpressIronSessionHandler extends IronSessionAuthHandler {
    constructor(config: IronSessionAuthConfig) {
        super(config);
    }

    async getIronSession(req: OneApiRequest, res?: OneApiResponse | null): Promise<IronSession<IronSessionData>> {
        return getIronSession<IronSessionData>(req, res!, this.sessionOptions);
    }
}
