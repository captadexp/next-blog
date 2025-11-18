import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {ContentType, NormalizedSection, NormalizedSettings, PermalinkState, Settings} from './types.js';
import {CONTENT_TYPES} from './types.js';

const META_KEY = 'permalink-manager:permalink';
const SETTINGS_KEY = 'settings';
const DEFAULT_FORMATS = {
    posts: ['{category_slug}/{post_slug}'],
    tags: ['tag/{tag_slug}'],
    categories: ['{category_slug}'],
    users: ['author/{user_slug}']
} as const;

function normalizeSettings(s: Settings = {}): NormalizedSettings {
    return CONTENT_TYPES.reduce<NormalizedSettings>((acc, key) => {
        const section = s[key] ?? {};
        const formats = section.formats?.length ? section.formats : [...DEFAULT_FORMATS[key]];
        const activeFormat = formats.includes(section.activeFormat ?? '') ? section.activeFormat! : formats[0];
        acc[key] = {formats, activeFormat};
        return acc;
    }, {} as NormalizedSettings);
}

export default defineServer({
    rpcs: {
        'permalink-manager:get': async (sdk, payload) => {
            switch (payload.type) {
                case 'posts': {
                    const blog = await sdk.db.blogs.findOne({_id: payload._id});
                    if (!blog) return {code: 404, message: 'Blog not found'};

                    const state = blog.metadata?.[META_KEY] as PermalinkState | undefined;
                    if (!state) return {code: 404, message: 'No permalink configuration found'};
                    return {code: 0, message: 'ok', payload: {state}};
                }
                case 'tags': {
                    const tag = await sdk.db.tags.findOne({_id: payload._id});
                    if (!tag) return {code: 404, message: 'Tag not found'};

                    const state = tag.metadata?.[META_KEY] as PermalinkState | undefined;
                    if (!state) return {code: 404, message: 'No permalink configuration found'};
                    return {code: 0, message: 'ok', payload: {state}};
                }
                case 'categories': {
                    const category = await sdk.db.categories.findOne({_id: payload._id});
                    if (!category) return {code: 404, message: 'Category not found'};

                    const state = category.metadata?.[META_KEY] as PermalinkState | undefined;
                    if (!state) return {code: 404, message: 'No permalink configuration found'};
                    return {code: 0, message: 'ok', payload: {state}};
                }
                case 'users': {
                    const user = await sdk.db.users.findOne({_id: payload._id});
                    if (!user) return {code: 404, message: 'User not found'};

                    const state = user.metadata?.[META_KEY] as PermalinkState | undefined;
                    if (!state) return {code: 404, message: 'No permalink configuration found'};
                    return {code: 0, message: 'ok', payload: {state}};
                }
                default:
                    return {code: -1, message: 'failed, unknown type'};
            }
        },
        'permalink-manager:set': async (sdk, payload) => {
            switch (payload.type) {
                case 'posts': {
                    const blog = await sdk.db.blogs.findOne({_id: payload._id});
                    if (!blog) return {code: 404, message: 'Blog not found'};

                    const updatedValue = await sdk.db.blogs.updateOne(
                        {_id: payload._id},
                        {
                            metadata: {[META_KEY]: payload.state},
                            updatedAt: Date.now()
                        }
                    );

                    return {code: 0, message: 'saved', payload: {state: updatedValue?.metadata?.[META_KEY]}};
                }
                case 'tags': {
                    const tag = await sdk.db.tags.findOne({_id: payload._id});
                    if (!tag) return {code: 404, message: 'Tag not found'};

                    await sdk.db.tags.updateOne(
                        {_id: payload._id},
                        {
                            metadata: {[META_KEY]: payload.state},
                            updatedAt: Date.now()
                        }
                    );

                    return {code: 0, message: 'saved', payload: {state: payload.state}};
                }
                case 'categories': {
                    const category = await sdk.db.categories.findOne({_id: payload._id});
                    if (!category) return {code: 404, message: 'Category not found'};

                    await sdk.db.categories.updateOne(
                        {_id: payload._id},
                        {
                            metadata: {[META_KEY]: payload.state},
                            updatedAt: Date.now()
                        }
                    );

                    return {code: 0, message: 'saved', payload: {state: payload.state}};
                }
                case 'users': {
                    const user = await sdk.db.users.findOne({_id: payload._id});
                    if (!user) return {code: 404, message: 'User not found'};

                    await sdk.db.users.updateOne(
                        {_id: payload._id},
                        {
                            metadata: {[META_KEY]: payload.state},
                            updatedAt: Date.now()
                        }
                    );

                    return {code: 0, message: 'saved', payload: {state: payload.state}};
                }
                default:
                    return {code: -1, message: 'failed, unknown type'};
            }
        },

        'permalink-manager:settings:get': async (sdk) => {
            const raw = (await sdk.settings.get(SETTINGS_KEY) as Settings | undefined) ?? {};
            const payload = normalizeSettings(raw);
            return {code: 0, message: 'ok', payload};
        },
        'permalink-manager:settings:set': async (sdk, incoming: { [K in ContentType]?: Partial<NormalizedSection> }) => {
            try {
                const current = (await sdk.settings.get(SETTINGS_KEY) as Settings | undefined) ?? {};
                const updated = {...current, ...incoming};
                await sdk.settings.set(SETTINGS_KEY, updated);
                const normalized = normalizeSettings(updated);
                return {code: 0, message: 'saved', payload: normalized};
            } catch (error) {
                console.error('Error in permalink:settings:set:', error);
                return {code: -1, message: 'failed to save settings', payload: undefined};
            }
        },
    },
});
