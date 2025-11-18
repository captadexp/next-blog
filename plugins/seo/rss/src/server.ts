import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {SeoHookPayload, ServerSDK} from '@supergrowthai/plugin-dev-kit/server';
import {DEFAULT_SETTINGS, generateRssFeed, type RssSettings} from './rss-generator.js';

const SETTINGS_KEY = 'seo-rss:settings';

async function getSettings(sdk: ServerSDK): Promise<RssSettings> {
    const stored = await sdk.settings.get<RssSettings>(SETTINGS_KEY);
    return {...DEFAULT_SETTINGS, ...stored};
}

export default defineServer({
    hooks: {
        'seo:rss': async (sdk: ServerSDK, payload: SeoHookPayload) => {
            sdk.log.info('Generating RSS feed');

            let settings = await getSettings(sdk);

            // If using system defaults, fetch and merge them
            if (settings.useJsonLdDefaults) {
                try {
                    const systemSettings = await sdk.callRPC('system:settings:get', {});
                    if (systemSettings?.payload) {
                        const {site, organization} = systemSettings.payload;
                        settings = {
                            ...settings,
                            siteTitle: settings.siteTitle || site?.name || '',
                            siteDescription: settings.siteDescription || site?.description || '',
                            publicationName: settings.publicationName || organization?.name || ''
                        };
                    }
                } catch (error) {
                    sdk.log.warn('Failed to fetch system settings');
                }
            }

            const data = await generateRssFeed(sdk, payload.siteUrl, settings);

            // Update last build time
            await sdk.settings.set('seo-rss:last-build', new Date().toUTCString());

            return {data};
        }
    },
    rpcs: {
        'rss:settings:get': async (sdk) => {
            const settings = await getSettings(sdk);
            return {code: 0, message: 'ok', payload: settings};
        },

        'rss:settings:set': async (sdk, settings: RssSettings) => {
            await sdk.settings.set(SETTINGS_KEY, settings);
            return {code: 0, message: 'Settings saved'};
        },

    }
});