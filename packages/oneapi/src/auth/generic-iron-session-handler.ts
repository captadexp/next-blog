import {IronSessionAuthConfig, IronSessionAuthHandler, IronSessionData} from "./iron-session-handler.js";
import {getIronSession, IronSession} from "iron-session";

export class GenericIronSessionHandler extends IronSessionAuthHandler {
    constructor(config: IronSessionAuthConfig) {
        super(config);
    }

    async getIronSession(req: Request, res?: Response | null): Promise<IronSession<IronSessionData>> {
        // For generic Request/Response, we need to handle cookies ourselves
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
                    res.headers.append('Set-Cookie', cookieString);
                }
            },
            delete: (name: string) => {
                if (res) {
                    res.headers.append('Set-Cookie', `${name}=; Max-Age=0; Path=/`);
                }
            }
        };

        return getIronSession<IronSessionData>(cookieStore as any, this.sessionOptions);
    }
}