import {OneApiRequest, OneApiResponse} from "@supergrowthai/oneapi";

export function setCookie(res: OneApiResponse, name: string, value: string, opts: {
    httpOnly?: boolean; secure?: boolean; sameSite?: "Lax" | "Strict" | "None";
    path?: string; maxAge?: number; domain?: string;
}) {
    const parts = [`${name}=${value}`];
    parts.push(`Path=${opts.path ?? "/"}`);
    if (opts.httpOnly) parts.push("HttpOnly");
    if (opts.secure) parts.push("Secure");
    parts.push(`SameSite=${opts.sameSite ?? "Lax"}`);
    if (opts.maxAge) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
    if (opts.domain) parts.push(`Domain=${opts.domain}`);

    const existingHeader = res.getHeader("Set-Cookie");

    res.setHeader("Set-Cookie", [...(Array.isArray(existingHeader) ? existingHeader : []), parts.join("; ")]);
}

export function getCookie(req: OneApiRequest, name: string): string | undefined {
    const raw = req.headers.get("cookie") || "";

    const map = Object.fromEntries(raw.split(/;\s*/).filter(Boolean).map((kv: string) => {
        const i = kv.indexOf("=");
        return [kv.slice(0, i), decodeURIComponent(kv.slice(i + 1))];
    }));
    return map[name];
}
