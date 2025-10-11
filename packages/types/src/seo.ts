/**
 * SEO-related types for sitemap, robots.txt, RSS feed, etc.
 */
import {DatabaseAdapter} from "./database/adapter";

// Sitemap types
export interface SitemapUrl {
    loc: string;
    lastmod?: string;
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority?: number;
}

export interface SitemapData {
    urlset: {
        '@_xmlns'?: string;
        url: SitemapUrl[];
    };
}

// Sitemap index types
export interface SitemapIndexEntry {
    loc: string;
    lastmod?: string;
}

export interface SitemapIndexData {
    sitemapindex: {
        '@_xmlns'?: string;
        sitemap: SitemapIndexEntry[];
    };
}

// Robots.txt types
export interface RobotsRule {
    userAgent: string;
    allow?: string | string[];
    disallow?: string | string[];
    crawlDelay?: number;
}

export interface RobotsData {
    rules: RobotsRule[];
    sitemap?: string | string[];
}

// LLMs.txt types
export interface LlmsSection {
    title: string;
    content: string;
}

export interface LlmsData {
    sections: LlmsSection[];
}

// RSS feed types
export interface RssImage {
    url: string;
    title: string;
    link: string;
    width?: number;
    height?: number;
    description?: string;
}

export interface RssEnclosure {
    '@_url': string;
    '@_length': number;
    '@_type': string;
}

export interface RssGuid {
    '@_isPermaLink': boolean;
    '#text': string;
}

export interface RssSource {
    '@_url': string;
    '#text': string;
}

export interface RssItem {
    title: string;
    link: string;
    description: string;
    author?: string;
    category?: string | string[];
    comments?: string;
    enclosure?: RssEnclosure;
    guid?: string | RssGuid;
    pubDate?: string;
    source?: RssSource;
}

export interface RssChannel {
    title: string;
    link: string;
    description: string;
    language?: string;
    copyright?: string;
    managingEditor?: string;
    webMaster?: string;
    pubDate?: string;
    lastBuildDate?: string;
    category?: string;
    generator?: string;
    docs?: string;
    ttl?: number;
    image?: RssImage;
    item: RssItem[];
}

export interface RssData {
    rss: {
        '@_version'?: string;
        '@_xmlns:atom'?: string;
        channel: RssChannel;
    };
}


//fyi duplicated to avoid cyclic deps. dont want to move OneApi* out of oneapi package.
export type OneApiRequest = Request & { [key: string]: any };
export type OneApiResponse = Response & { setHeader(key: string, value: string): void };

export interface MinimumRequest<HEADERS = any, BODY = any, QUERY = any> {
    query: QUERY;
    body: BODY;
    method: 'POST' | 'GET' | 'DELETE' | 'OPTIONS' | 'PUT' | 'PATCH' | 'HEAD';
    headers: HEADERS;
    cookies?: any;
    url: string;
    _response?: OneApiResponse;
    _request?: OneApiRequest;
    _params?: Record<string, string>;
}

// Hook payload types
export interface SeoHookPayload {
    siteUrl: string;
    request: MinimumRequest;
}

export interface SeoHookPayloadWithDb extends SeoHookPayload {
    db: DatabaseAdapter;
}