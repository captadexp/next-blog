import {defineServer} from '@supergrowthai/plugin-dev-kit';

const META_KEY = 'permalink-manager:permalink';
const SETTINGS_KEY = 'settings'; // Changed this line
const DEFAULT_SETTINGS = {
    blogs: {
        formats: ['{slug}', '{category}/{slug}', '{year}/{month}/{slug}'],
        activeFormat: '{slug}'
    }
};

export default defineServer({
    rpcs: {
        'permalink:blogs:get': async (sdk, {blogId}: { blogId: string }) => {
            const blog = await sdk.db.blogs.findOne({_id: blogId});

            return {
                code: 0,
                message: 'ok',
                payload: {state: blog?.metadata?.[META_KEY] ?? ''}
            };
        },
        'permalink:blogs:set': async (sdk, {blogId, state}: {
            blogId: string;
            state: { permalink: string, pattern: string }
        }) => {
            const blog = await sdk.db.blogs.findOne({_id: blogId});
            if (!blog) return {code: 404, message: 'Blog not found'};

            await sdk.db.blogs.updateOne(
                {_id: blogId},
                {
                    metadata: {[META_KEY]: state},
                    updatedAt: Date.now()
                }
            );

            return {code: 0, message: 'saved', payload: {state}};
        },
        'permalink:settings:get': async (sdk, {}: {}) => {
            const stored = await sdk.settings.get(SETTINGS_KEY) as any || {};
            const settings = {
                blogs: {
                    ...DEFAULT_SETTINGS.blogs,
                    ...(stored.blogs || {}),
                }
            };
            return {code: 0, message: 'ok', payload: settings};
        },
        'permalink:settings:set': async (sdk, settings: {
            blogs?: { formats?: string[]; activeFormat?: string };
        }) => {
            const newSettings = {
                blogs: {
                    ...DEFAULT_SETTINGS.blogs,
                    ...(settings.blogs || {}),
                }
            };

            await sdk.settings.set(SETTINGS_KEY, newSettings);

            return {code: 0, message: 'saved', payload: newSettings};
        }
    }
});
