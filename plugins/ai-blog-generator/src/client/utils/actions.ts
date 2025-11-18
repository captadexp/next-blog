import type {ClientSDK} from '@supergrowthai/plugin-dev-kit/client';
import type {BlogGenerationSettings, PluginStatus} from './types.js';

export async function updateSettings(sdk: ClientSDK, updates: Partial<BlogGenerationSettings>) {
    await sdk.callRPC('ai-generator:updateSettings', updates);
}

export async function addTopic(sdk: ClientSDK, topic: string): Promise<PluginStatus> {
    if (!topic.trim()) {
        throw new Error('Please enter a topic');
    }

    // Get current status to get existing topics
    const statusResponse = await sdk.callRPC('ai-generator:getStatus', {});
    const status = statusResponse as PluginStatus;

    const topics = [...status.topics, topic.trim()];
    await updateSettings(sdk, {topics});

    // Get and return updated status
    const updatedStatusResponse = await sdk.callRPC('ai-generator:getStatus', {});
    return updatedStatusResponse as PluginStatus;
}

export async function removeTopic(sdk: ClientSDK, index: number): Promise<PluginStatus> {
    // Get current status to get existing topics
    const statusResponse = await sdk.callRPC('ai-generator:getStatus', {});
    const status = statusResponse as PluginStatus;

    const topics = status.topics.filter((_: any, i: number) => i !== index);
    await updateSettings(sdk, {topics});

    // Get and return updated status
    const updatedStatusResponse = await sdk.callRPC('ai-generator:getStatus', {});
    return updatedStatusResponse as PluginStatus;
}

export async function setApiKey(sdk: ClientSDK, provider: 'openai' | 'grok' | 'gemini', apiKey: string): Promise<PluginStatus> {
    const response = await sdk.callRPC('ai-generator:setApiKey', {provider, apiKey});
    return response as PluginStatus;
}