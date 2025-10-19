import {defineServer} from '@supergrowthai/plugin-dev-kit';

const META_KEY = 'permalink-manager:permalink';
const SETTINGS_KEY = 'permalink-manager:settings';
const DEFAULT_FORMATS = ['{slug}', '{category}/{slug}', '{year}/{month}/{slug}'];

export default defineServer({
    rpcs: {
        'permalink:get': async (sdk, {blogId}: { blogId: string }) => {
            const blog = await sdk.db.blogs.findOne({_id: blogId});

            return {
                code: 0,
                message: 'ok',
                payload: {state: blog?.metadata?.[META_KEY] ?? ''}
            };
        },
        'permalink:set': async (sdk, {blogId, state}: {
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

            const settings = await sdk.settings.get(SETTINGS_KEY) as {
                formats?: string[];
                activeFormat?: string
            } || {};
            const formats = settings.formats?.length ? settings.formats : DEFAULT_FORMATS;
            const activeFormat = formats.includes(settings.activeFormat || '') ? settings.activeFormat! : formats[0];

            return {code: 0, message: 'ok', payload: {formats, activeFormat}};
        },
        'permalink:settings:set': async (sdk, {formats, activeFormat}: {
            blogId: string;
            formats?: string[];
            activeFormat?: string
        }) => {


            const current = await sdk.settings.get(SETTINGS_KEY) as { formats?: string[]; activeFormat?: string } || {};
            const nextFormats = formats?.length ? formats : (current.formats || DEFAULT_FORMATS);
            const nextActive = nextFormats.includes(activeFormat || '')
                ? activeFormat!
                : (nextFormats.includes(current.activeFormat || '') ? current.activeFormat! : nextFormats[0]);

            await sdk.settings.set(
                SETTINGS_KEY,
                {formats: nextFormats, activeFormat: nextActive}
            );

            return {code: 0, message: 'saved', payload: {formats: nextFormats, activeFormat: nextActive}};
        }
    }
});