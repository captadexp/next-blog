import type {MinimumRequest, OneApiFunctionResponse, SessionData} from "@supergrowthai/oneapi";
import type {ApiExtra} from "../types/api.js";
import {XMLBuilder} from "fast-xml-parser";

const xmlBuilder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    indentBy: '  '
});

export async function getSitemap(session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse | Response> {
    const db = await extra.db();
    const baseUrl = request.headers['host'];
    const protocol = request.headers['x-forwarded-proto'] || 'https';
    const siteUrl = `${protocol}://${baseUrl}`;

    const hookResult = await extra.callHook('seo:sitemap', {
        siteUrl,
        db,
        request
    });

    // Check if plugin returned a direct Response (for streaming, redirects, etc.)
    if (hookResult instanceof Response) {
        return hookResult;
    }

    // Handle traditional data response
    const sitemapData = hookResult?.data || {
        urlset: {
            '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
            url: []
        }
    };

    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlBuilder.build(sitemapData);

    return new Response(xml, {
        status: 200,
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}

export async function getSitemapIndex(session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse | Response> {
    const baseUrl = request.headers['host'];
    const protocol = request.headers['x-forwarded-proto'] || 'https';
    const siteUrl = `${protocol}://${baseUrl}`;

    const hookResult = await extra.callHook('seo:sitemap-index', {
        siteUrl,
        request
    });

    // Check if plugin returned a direct Response (for streaming, redirects, etc.)
    if (hookResult instanceof Response) {
        return hookResult;
    }


    const sitemapIndexData = hookResult?.data || {
        sitemapindex: {
            '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
            sitemap: []
        }
    };

    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlBuilder.build(sitemapIndexData);

    return new Response(xml, {
        status: 200,
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}

export async function getRobotsTxt(session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse | Response> {
    const baseUrl = request.headers['host'];
    const protocol = request.headers['x-forwarded-proto'] || 'https';
    const siteUrl = `${protocol}://${baseUrl}`;

    const hookResult = await extra.callHook('seo:robots.txt', {
        siteUrl,
        request
    });

    // Check if plugin returned a direct Response (for streaming, redirects, etc.)
    if (hookResult instanceof Response) {
        return hookResult;
    }


    const robotsData = hookResult?.data || {
        rules: [
            {userAgent: '*', allow: '/'}
        ]
    };

    const lines: string[] = [];

    robotsData.rules?.forEach((rule: any) => {
        if (rule.userAgent) lines.push(`User-agent: ${rule.userAgent}`);
        if (rule.allow) {
            const allows = Array.isArray(rule.allow) ? rule.allow : [rule.allow];
            allows.forEach((path: string) => lines.push(`Allow: ${path}`));
        }
        if (rule.disallow) {
            const disallows = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
            disallows.forEach((path: string) => lines.push(`Disallow: ${path}`));
        }
        if (rule.crawlDelay) lines.push(`Crawl-delay: ${rule.crawlDelay}`);
        lines.push('');
    });

    if (robotsData.sitemap) {
        const sitemaps = Array.isArray(robotsData.sitemap) ? robotsData.sitemap : [robotsData.sitemap];
        sitemaps.forEach((sitemap: string) => lines.push(`Sitemap: ${sitemap}`));
    }

    const content = lines.join('\n').trim();

    return new Response(content, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}

export async function getLlmsTxt(session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse | Response> {
    const db = await extra.db();
    const baseUrl = request.headers['host'];
    const protocol = request.headers['x-forwarded-proto'] || 'https';
    const siteUrl = `${protocol}://${baseUrl}`;

    const hookResult = await extra.callHook('seo:llms.txt', {
        siteUrl,
        db,
        request
    });

    // Check if plugin returned a direct Response (for streaming, redirects, etc.)
    if (hookResult instanceof Response) {
        return hookResult;
    }


    const llmsData = hookResult?.data || {sections: []};

    const content = llmsData.sections?.map((section: any) =>
        `# ${section.title}\n\n${section.content}`
    ).join('\n\n') || '';

    return new Response(content, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}

export async function getRssFeed(session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse | Response> {
    const db = await extra.db();
    const baseUrl = request.headers['host'];
    const protocol = request.headers['x-forwarded-proto'] || 'https';
    const siteUrl = `${protocol}://${baseUrl}`;

    const hookResult = await extra.callHook('seo:rss', {
        siteUrl,
        db,
        request
    });

    // Check if plugin returned a direct Response (for streaming, redirects, etc.)
    if (hookResult instanceof Response) {
        return hookResult;
    }


    const rssData = hookResult?.data || {
        rss: {
            '@_version': '2.0',
            '@_xmlns:atom': 'http://www.w3.org/2005/Atom',
            channel: {
                title: 'RSS Feed',
                link: siteUrl,
                description: 'RSS Feed',
                item: []
            }
        }
    };

    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlBuilder.build(rssData);

    return new Response(xml, {
        status: 200,
        headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}