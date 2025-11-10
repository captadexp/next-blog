import type {AuthResult, IAuthHandler, OneApiRequest, OneApiResponse} from "@supergrowthai/oneapi";
import type {DatabaseAdapter, User} from "@supergrowthai/next-blog-types/server";
import crypto from "../utils/crypto.js";
import {Session as SessionStoreSession, SessionManager} from "./sessions";
import {getCookie, setCookie} from "./cookie";
import createDefaultAdminUser from "./create-default-admin-user.ts";

const COOKIE_SECURE = process.env.NODE_ENV === "production";
const COOKIE_DOMAIN = undefined;
const SID_COOKIE = "sid";
const CSRF_COOKIE = "csrf";

type Credentials = { username: string, password: string }

export class SessionAuthHandler implements IAuthHandler<Credentials, User, SessionStoreSession | null> {
    constructor(private dbp: () => Promise<DatabaseAdapter>, private sessionStore: SessionManager) {
    }

    async login(credentials: Credentials, req: OneApiRequest, res: OneApiResponse): Promise<AuthResult<User>> {
        const {username, password} = credentials || {};
        if (!username || !password) return {success: false, error: "Invalid credentials"};

        const db = await this.dbp();
        const user = await db.users.findOne({username: username.trim().toLowerCase()});
        const ok = user ? crypto.comparePassword(password, user.password) : false;
        if (!ok || !user) return {success: false, error: "Invalid credentials"};

        const store = this.sessionStore;
        const sess = await store.create(user, (req as any).ip, (req as any).headers?.["user-agent"]);

        // Set cookies: sid (httpOnly), csrf (readable)
        setCookie(res, SID_COOKIE, sess.id, {
            httpOnly: true,
            secure: COOKIE_SECURE,
            sameSite: "Lax",
            maxAge: 60 * 60 * 12,
            domain: COOKIE_DOMAIN
        });
        setCookie(res, CSRF_COOKIE, sess.csrf, {
            httpOnly: false,
            secure: COOKIE_SECURE,
            sameSite: "Lax",
            maxAge: 60 * 60 * 12,
            domain: COOKIE_DOMAIN
        });

        const {password: _, ...publicUser} = user;
        return {success: true, user: publicUser as User};
    }

    async logout(req: OneApiRequest, res: OneApiResponse): Promise<void> {
        const store = this.sessionStore;
        const sid = getCookie(req, SID_COOKIE);
        if (sid) await store.destroy(sid);
        setCookie(res, SID_COOKIE, "", {
            httpOnly: true,
            secure: COOKIE_SECURE,
            sameSite: "Lax",
            maxAge: 0,
            domain: COOKIE_DOMAIN
        });
        setCookie(res, CSRF_COOKIE, "", {
            httpOnly: false,
            secure: COOKIE_SECURE,
            sameSite: "Lax",
            maxAge: 0,
            domain: COOKIE_DOMAIN
        });
    }

    async getUser(req: OneApiRequest, _res?: OneApiResponse | null): Promise<User | null> {
        const db = await this.dbp();
        const sess = await this.getSession(req, _res);
        if (!sess) {
            const hasUser = await db.users.findOne({});

            if (!hasUser || hasUser.email === "admin@nextblog.local") {
                const adminUser = await createDefaultAdminUser(db, "password");

                console.log("\n" + "=".repeat(80));
                console.log("=".repeat(20) + " DEFAULT ADMIN USER CREATED " + "=".repeat(20));
                console.log("=".repeat(80));
                console.log(`Username: ${adminUser.username}`);
                console.log(`Password: password`);
                console.log(`Email: ${adminUser.email}`);
                console.log("IMPORTANT: Please change these credentials immediately after first login!");
                console.log("=".repeat(80) + "\n");
            }
            return null;
        }

        const user = await db.users.findOne({_id: sess.userId});
        if (!user) return null;
        const {password: _, ...publicUser} = user;
        return publicUser as User;
    }

    async isAuthenticated(req: OneApiRequest, res?: OneApiResponse | null): Promise<boolean> {
        return (await this.getUser(req, res)) !== null;
    }

    async updateUser(_user: any): Promise<void> {
    }

    async getSession(req: OneApiRequest, res?: OneApiResponse | null): Promise<SessionStoreSession | null> {
        const store = this.sessionStore;
        const sid = getCookie(req, SID_COOKIE);
        if (!sid) return null;
        const sess = await store.get(sid);
        if (!sess) return null;

        // optional soft pin (ignore if UA changes slightly)
        if (!store.uaMatches(sess.uaHash, (req as any).headers?.["user-agent"])) return null;

        await store.touch(sid);

        return sess;
    }
}
