import type { ClientSDK } from '@supergrowthai/plugin-dev-kit/client';
import type { BlogGenerationSettings } from './types.js';

export async function updateSettings(sdk: ClientSDK, updates: Partial<BlogGenerationSettings>) {
    await sdk.callRPC('ai-generator:updateSettings', updates);
}

export async function addTopic(sdk: ClientSDK, topic: string) {
    if (!topic.trim()) {
        throw new Error('Please enter a topic');
    }

    // Get current status to get existing topics
    const statusResponse = await sdk.callRPC('ai-generator:getStatus', {});
    const status = statusResponse.payload as any;

    const topics = [...status.topics, topic.trim()];
    await updateSettings(sdk, { topics });
}

export async function removeTopic(sdk: ClientSDK, index: number) {
    // Get current status to get existing topics
    const statusResponse = await sdk.callRPC('ai-generator:getStatus', {});
    const status = statusResponse.payload as any;

    const topics = status.topics.filter((_: any, i: number) => i !== index);
    await updateSettings(sdk, { topics });
}