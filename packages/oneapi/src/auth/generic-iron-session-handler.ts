import {IronSessionAuthConfig, IronSessionAuthHandler, IronSessionData} from "./iron-session-handler.js";
import {getIronSession, IronSession} from "iron-session";
import {CommonRequest, OneApiResponse} from "../types.ts";

export class GenericIronSessionHandler extends IronSessionAuthHandler {
    constructor(config: IronSessionAuthConfig) {
        super(config);
    }

    async getIronSession(req: CommonRequest, res?: OneApiResponse | null): Promise<IronSession<IronSessionData>> {

        const cookieStore = {
            get: (name: string) => {
                const cookieHeader = req.headers.get('cookie') || '';
                const cookies = Object.fromEntries(
                    cookieHeader.split(';').map(c => {
                        const [key, ...val] = c.trim().split('=');
                        return [key, val.join('=')];
                    }).filter(([k]) => k)
                );
                return cookies[name];
            },
            set: (name: string, value: string, options: any) => {
                if (res) {
                    const cookieString = `${name}=${value}; ${Object.entries(options || {})
                        .filter(([, v]) => v !== undefined)
                        .map(([k, v]) => {
                            if (k === 'maxAge') return `Max-Age=${v}`;
                            if (k === 'httpOnly' && v) return 'HttpOnly';
                            if (k === 'secure' && v) return 'Secure';
                            if (k === 'sameSite') return `SameSite=${v}`;
                            return `${k}=${v}`;
                        }).join('; ')}`;
                    const existingHeader = res.getHeader("Set-Cookie");
                    res.setHeader("Set-Cookie", [...(Array.isArray(existingHeader) ? existingHeader : []), cookieString]);
                }
            },
            delete: (name: string) => {
                if (res) {
                    const existingHeader = res.getHeader("Set-Cookie");
                    const cookieString = `${name}=; Max-Age=0; Path=/`;
                    res.setHeader("Set-Cookie", [...(Array.isArray(existingHeader) ? existingHeader : []), cookieString]);
                }
            }
        };

        return getIronSession<IronSessionData>(cookieStore as any, this.sessionOptions);
    }
}