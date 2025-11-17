import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {RobotsData, SeoHookPayload, ServerSDK} from '@supergrowthai/plugin-dev-kit/server';

const SETTINGS_KEY = 'seo-robots:settings';

interface RobotsSettings {
    rules: Array<{
        userAgent: string;
        allow?: string[];
        disallow?: string[];
        crawlDelay?: number;
    }>;
    sitemapPath?: string;
    useHostHeader?: boolean;
}

const DEFAULT_SETTINGS: RobotsSettings = {
    rules: [
        {
            userAgent: '*',
            allow: ['/'],
            disallow: ['/api/next-blog']
        }
    ],
    sitemapPath: '/sitemap.xml',
    useHostHeader: true
};

export default defineServer({
    hooks: {
        'seo:robots.txt': async (sdk: ServerSDK, payload: SeoHookPayload): Promise<{ data: RobotsData }> => {
            const settings = await sdk.settings.get(SETTINGS_KEY) as RobotsSettings || DEFAULT_SETTINGS;

            const siteUrlObj = new URL(payload.siteUrl);

            const hostname = settings.useHostHeader
                ? payload.request.headers.host
                : siteUrlObj.host;

            const protocol = payload.request.headers['x-forwarded-proto'] || 'https';
            const baseUrl = `${protocol}://${hostname}`;

            return {
                data: {
                    rules: settings.rules,
                    sitemap: settings.sitemapPath ? `${baseUrl}${settings.sitemapPath}` : undefined
                }
            };
        }
    },
    rpcs: {
        'robots:settings:get': async (sdk) => {
            const settings = await sdk.settings.get(SETTINGS_KEY) as RobotsSettings || DEFAULT_SETTINGS;
            return {code: 0, message: 'ok', payload: settings};
        },
        'robots:settings:set': async (sdk, settings: RobotsSettings) => {
            await sdk.settings.set(SETTINGS_KEY, settings);
            return {code: 0, message: 'saved', payload: settings};
        }
    }
});