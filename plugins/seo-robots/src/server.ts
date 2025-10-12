import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {RobotsData, SeoHookPayload, ServerSDK} from '@supergrowthai/plugin-dev-kit/server';

export default defineServer({
    hooks: {
        'seo:robots.txt': async (sdk: ServerSDK, payload: SeoHookPayload): Promise<{ data: RobotsData }> => {
            sdk.log.info('Generating robots.txt');

            // Simple robots.txt configuration
            return {
                data: {
                    rules: [
                        {
                            userAgent: '*',
                            allow: '/',
                            disallow: ['/admin', '/api', '/private'],
                            crawlDelay: 1
                        },
                        {
                            userAgent: 'Googlebot',
                            allow: '/',
                            crawlDelay: 0
                        }
                    ],
                    sitemap: `${payload.siteUrl}/api/seo/sitemap.xml`
                }
            };
        }
    }
});