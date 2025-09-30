import {ServerSDK} from './index';
import {createMockServerSDK} from './mock-sdk';
import {ServerPluginModule} from "@supergrowthai/types";

export interface TestOptions {
    hook: string;
    sdk?: ServerSDK;
    payload?: any;
}

export async function testServerPlugin(plugin: ServerPluginModule, options: TestOptions) {
    const {hook, payload = {}} = options;
    const sdk = options.sdk || createMockServerSDK();

    console.group(`Testing Server Plugin: ${sdk.pluginId}`);
    console.log('Hook:', hook);
    console.log('Payload:', payload);

    const hookFn = plugin.hooks?.[hook];
    if (!hookFn) {
        console.error(`Hook "${hook}" not found in plugin`);
        console.log('Available hooks:', plugin.hooks ? Object.keys(plugin.hooks) : 'No hooks defined');
        console.groupEnd();
        return null;
    }

    try {
        const result = await hookFn(sdk, payload);
        console.log('Result:', result);
        console.groupEnd();
        return result;
    } catch (error) {
        console.error('Error executing hook:', error);
        console.groupEnd();
        throw error;
    }
}