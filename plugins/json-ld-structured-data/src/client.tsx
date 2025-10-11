import {defineClient} from '@supergrowthai/plugin-dev-kit';
import {useBlogSidebarHook, useSettingsPanelHook} from './client/index.js';
import './types/rpc-types.js';
import './styles.css';

// Client-side hooks that run in the browser
export default defineClient({
    hooks: {
        // Global settings panel
        'system:plugin:settings-panel': useSettingsPanelHook,

        // Below Blog Editor form on update page
        'editor-sidebar-widget': useBlogSidebarHook
    },
    hasSettingsPanel: true
});