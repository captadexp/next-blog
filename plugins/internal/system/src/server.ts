import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {ServerSDK} from '@supergrowthai/plugin-dev-kit/server';

interface CommonSettings {
    website: {
        url: string;
        name: string;
        description: string;
    };
    organization: {
        name: string;
        url: string;
        logoMediaId?: string;
    };
    site: {
        title: string;
        description: string;
        language: string;
    };
}

const SETTINGS_KEY = 'system:common-settings';

const DEFAULT_SETTINGS: CommonSettings = {
    website: {
        url: '',
        name: '',
        description: ''
    },
    organization: {
        name: '',
        url: '',
        logoMediaId: undefined
    },
    site: {
        title: '',
        description: '',
        language: 'en-US'
    }
};

async function getSettings(sdk: ServerSDK): Promise<CommonSettings> {
    const stored = await sdk.settings.get<CommonSettings>(SETTINGS_KEY);
    if (!stored) {
        return DEFAULT_SETTINGS;
    }

    // Merge with defaults to ensure all fields exist
    return {
        website: {...DEFAULT_SETTINGS.website, ...stored.website},
        organization: {...DEFAULT_SETTINGS.organization, ...stored.organization},
        site: {...DEFAULT_SETTINGS.site, ...stored.site}
    };
}

export default defineServer({
    hooks: {
        'plugins:loaded': async (sdk: ServerSDK) => {
            sdk.log.info('System plugin initialized');

            // Ensure default settings exist
            const settings = await getSettings(sdk);
            if (!settings.website.url && !settings.site.title) {
                sdk.log.info('Initializing default common settings');
                await sdk.settings.set(SETTINGS_KEY, DEFAULT_SETTINGS);
            }
        }
    },

    rpcs: {
        // Common settings RPCs
        'settings:common:get': async (sdk: ServerSDK) => {
            const settings = await getSettings(sdk);
            return {code: 0, message: 'ok', payload: settings};
        },

        'settings:common:set': async (sdk: ServerSDK, request: { settings: CommonSettings }) => {
            if (!request.settings) {
                return {code: 400, message: 'Settings are required'};
            }

            await sdk.settings.set(SETTINGS_KEY, request.settings);
            sdk.log.info('Common settings updated');

            return {code: 0, message: 'Settings saved successfully'};
        },

        'settings:common:get-field': async (sdk: ServerSDK, request: { field: keyof CommonSettings }) => {
            if (!request.field) {
                return {code: 400, message: 'Field name is required'};
            }

            const settings = await getSettings(sdk);
            const fieldValue = settings[request.field];

            if (!fieldValue) {
                return {code: 404, message: `Field ${request.field} not found`};
            }

            return {code: 0, message: 'ok', payload: fieldValue};
        },

        // Convenience methods for specific sections
        'settings:website:get': async (sdk: ServerSDK) => {
            const settings = await getSettings(sdk);
            return {code: 0, message: 'ok', payload: settings.website};
        },

        'settings:organization:get': async (sdk: ServerSDK) => {
            const settings = await getSettings(sdk);
            return {code: 0, message: 'ok', payload: settings.organization};
        },

        'settings:site:get': async (sdk: ServerSDK) => {
            const settings = await getSettings(sdk);
            return {code: 0, message: 'ok', payload: settings.site};
        }
    }
});