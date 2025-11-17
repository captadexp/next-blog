import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {ServerSDK} from '@supergrowthai/plugin-dev-kit/server';

interface SystemSettings {
    site: {
        name: string;
        url: string;
        title: string;
        description: string;
        language: string;
    };
    organization: {
        name: string;
        url: string;
        logoMediaId?: string;
    };
}

const SETTINGS_KEY = 'system:settings';

export default defineServer({
    rpcs: {
        'system:settings:get': async (sdk: ServerSDK, request?: { key?: string }) => {
            const stored = await sdk.settings.get<SystemSettings>(SETTINGS_KEY);

            if (request?.key) {
                const keys = request.key.split('.');
                let value: any = stored;
                for (const k of keys) {
                    value = value?.[k];
                }
                if (value === undefined) {
                    return {code: 404, message: `Key ${request.key} not found`};
                }
                return {code: 0, message: 'ok', payload: value};
            }

            return {code: 0, message: 'ok', payload: stored || {}};
        },

        'system:settings:set': async (sdk: ServerSDK, request: { key?: string; value: any }) => {
            if (!request.value) {
                return {code: 400, message: 'Value is required'};
            }

            if (request.key) {
                const stored = await sdk.settings.get<SystemSettings>(SETTINGS_KEY) || {} as SystemSettings;
                const keys = request.key.split('.');
                let obj: any = stored;

                for (let i = 0; i < keys.length - 1; i++) {
                    if (!obj[keys[i]]) {
                        obj[keys[i]] = {};
                    }
                    obj = obj[keys[i]];
                }
                obj[keys[keys.length - 1]] = request.value;

                await sdk.settings.set(SETTINGS_KEY, stored);
            } else {
                await sdk.settings.set(SETTINGS_KEY, request.value);
            }

            return {code: 0, message: 'Settings saved successfully'};
        }
    }
});