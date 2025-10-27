import {defineClient} from '@supergrowthai/plugin-dev-kit';
import {BlogSidebarWidget} from './components/BlogSidebarWidget.js';
import {GlobalSettingsPanel} from './components/GlobalSettingsPanel.js';
import "./styles.css"

export default defineClient({
    hooks: {
        'blog-update-sidebar-widget': (sdk, _prev, context) => <BlogSidebarWidget sdk={sdk} context={context}/>,
        'system:plugin:settings-panel': (sdk, _prev, context) => <GlobalSettingsPanel sdk={sdk} context={context}/>
    },
    hasSettingsPanel: true
});