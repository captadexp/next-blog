import type {BlogJsonLdOverrides, GlobalJsonLdSettings} from '../../types/plugin-types.js';

export interface PluginState {
    globalSettings: GlobalJsonLdSettings;
    blogOverrides: Record<string, BlogJsonLdOverrides>;
    isLoadingSettings: boolean;
    isSavingSettings: boolean;
    isLoadingBlogData: boolean;
    currentBlogId: string | null;
    currentBlogData: any;
    jsonPreview: string;
    showPreview: boolean;
    validationErrors: Array<{ field: string; message: string }>;
    initialized: boolean;
}

export const pluginState: PluginState = {
    globalSettings: {},
    blogOverrides: {},
    isLoadingSettings: false,
    isSavingSettings: false,
    isLoadingBlogData: false,
    currentBlogId: null,
    currentBlogData: null,
    jsonPreview: '',
    showPreview: false,
    validationErrors: [],
    initialized: false
};

export function getPluginState(): PluginState {
    return pluginState;
}

export function updatePluginState(updates: Partial<PluginState>): void {
    Object.assign(pluginState, updates);
}

export function getBlogOverrides(blogId: string): BlogJsonLdOverrides {
    return pluginState.blogOverrides[blogId] || {
        '@type': 'Article',
        overrides: {},
        custom: {}
    };
}

export function setBlogOverrides(blogId: string, overrides: BlogJsonLdOverrides): void {
    pluginState.blogOverrides[blogId] = overrides;
}