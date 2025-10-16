import type {User} from "@supergrowthai/next-blog-types/server";
import {randomBytes, timingSafeEqual} from "crypto";
import {InMemoryKV} from "./InMemoryKV.ts";

export interface Session {
    id: string;
    userId: string;
    createdAt: number;
    lastSeenAt: number;
    ip?: string;
    uaHash?: string;
    csrf: string;
    expiresAt: number;
}

const TTL_MS = 1000 * 60 * 60 * 12; // 12h absolute
const ID_LEN = 32;

//this needs to be fixed its very temp right now
const kv = new InMemoryKV()

export class SessionStore {
    constructor() {
    }

    newId() {
        return randomBytes(ID_LEN).toString("base64url");
    }

    newCsrf() {
        return randomBytes(24).toString("base64url");
    }

    async create(user: User, ip?: string, ua?: string): Promise<Session> {
        const id = this.newId();
        const csrf = this.newCsrf();
        const now = Date.now();
        const sess: Session = {
            id,
            userId: user._id,
            csrf,
            createdAt: now, lastSeenAt: now,
            ip,
            uaHash: ua ? this.hashUA(ua) : undefined,
            expiresAt: now + TTL_MS
        };
        await kv.set(this.sidKey(id), sess, {ttlMs: TTL_MS});
        return sess;
    }

    async get(id: string): Promise<Session | null> {
        const s = await kv.get(this.sidKey(id));
        if (!s) return null;
        if (Date.now() > s.expiresAt) {
            await this.destroy(id);
            return null;
        }
        return s as Session;
    }

    async touch(id: string): Promise<void> {
        const s = await this.get(id);
        if (!s) return;
        s.lastSeenAt = Date.now();
        await kv.set(this.sidKey(id), s, {ttlMs: s.expiresAt - Date.now()});
    }

    async rotate(oldId: string): Promise<Session | null> {
        const s = await this.get(oldId);
        if (!s) return null;
        await this.destroy(oldId);
        const now = Date.now();
        const newId = this.newId();
        const newCsrf = this.newCsrf();
        const ns: Session = {...s, id: newId, csrf: newCsrf, lastSeenAt: now, createdAt: now, expiresAt: now + TTL_MS};
        await kv.set(this.sidKey(newId), ns, {ttlMs: TTL_MS});
        return ns;
    }

    async destroy(id: string): Promise<void> {
        await kv.delete?.(this.sidKey(id));
    }

    hashUA(ua: string) {
        return ua.normalize(); /* keep simple; or hash if you like */
    }

    uaMatches(saved?: string, current?: string) {
        if (!saved || !current) return true;
        try {
            const a = Buffer.from(saved);
            const b = Buffer.from(this.hashUA(current));
            return a.length === b.length && timingSafeEqual(a, b);
        } catch {
            return false;
        }
    }

    private sidKey(id: string) {
        return `sess:${id}`;
    }
}
