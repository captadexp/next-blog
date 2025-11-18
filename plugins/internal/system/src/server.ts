import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {ServerSDK} from '@supergrowthai/plugin-dev-kit/server';

const SETTINGS_KEY = 'system:settings';

export default defineServer({
    rpcs: {
        'system:settings:get': async (sdk: ServerSDK) => {
            const stored = await sdk.settings.get(SETTINGS_KEY);
            return {code: 0, message: 'ok', payload: stored};
        },

        'system:settings:set': async (sdk: ServerSDK, request: { value: any }) => {
            await sdk.settings.set(SETTINGS_KEY, request.value);
            return {code: 0, message: 'Settings saved successfully'};
        }
    }
});