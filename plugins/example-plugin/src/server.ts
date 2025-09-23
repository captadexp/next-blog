import type {ServerContext} from '@supergrowthai/plugin-dev-kit';

export async function onInstall(context: ServerContext) {
    console.log(`Installing ${context.id} v${context.version}`);

    await context.api.storage.set('installed_at', new Date().toISOString());

    if (context.config.apiKey) {
        console.log('API key configured, validating...');
    }

    return {success: true};
}

export async function onUninstall(context: ServerContext) {
    console.log(`Uninstalling ${context.id}`);

    await context.api.storage.delete('installed_at');
    await context.api.storage.delete('count');

    return {success: true};
}

export async function processData(context: ServerContext, data: any) {
    const timestamp = new Date().toISOString();

    const processedData = {
        ...data,
        processedAt: timestamp,
        pluginId: context.id,
        pluginVersion: context.version,
    };

    await context.api.storage.set(`processed_${timestamp}`, processedData);

    return processedData;
}

export async function getStats(context: ServerContext) {
    const installedAt = await context.api.storage.get('installed_at');
    const count = await context.api.storage.get('count');

    return {
        installedAt,
        currentCount: count || 0,
        pluginId: context.id,
        version: context.version,
        config: context.config,
    };
}