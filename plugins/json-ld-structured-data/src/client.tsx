import {defineClient} from '@supergrowthai/plugin-dev-kit';
import {injectStyles, useBlogSidebarHook, useSettingsPanelHook} from './client/index.js';
import './types/rpc-types.js';

// Initialize styles
injectStyles();

// Client-side hooks that run in the browser
export default defineClient({
    hooks: {
        // Global settings panel
        'system:plugin:settings-panel': useSettingsPanelHook,

        // Below Blog Editor form on update page
        'blog-update-form:after': useBlogSidebarHook
    },
    hasSettingsPanel: true
});