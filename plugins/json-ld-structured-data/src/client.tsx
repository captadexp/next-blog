import {defineClient} from '@supergrowthai/plugin-dev-kit';
import {BlogSidebarWidget} from './components/BlogSidebarWidget.js';
import {GlobalSettingsPanel} from './components/GlobalSettingsPanel.js';
import {GenericSidebarWidget} from './components/GenericSidebarWidget.js';
import "./styles.css"

export default defineClient({
    hooks: {
        'blog-update-sidebar-widget': (sdk, _prev, context) => <BlogSidebarWidget sdk={sdk} context={context}/>,
        'tag-update-sidebar-widget': (sdk, _prev, context) => (
            <GenericSidebarWidget
                sdk={sdk}
                context={context}
                entityType="tag"
                entityId={context.tagId}
                title="JSON-LD Structured Data"
                description="Generate DefinedTerm, Keyword, or other schema types"
            />
        ),
        'category-update-sidebar-widget': (sdk, _prev, context) => (
            <GenericSidebarWidget
                sdk={sdk}
                context={context}
                entityType="category"
                entityId={context.categoryId}
                title="JSON-LD Structured Data"
                description="Generate CategoryCode, DefinedTerm, or Organization schema"
            />
        ),
        'user-update-sidebar-widget': (sdk, _prev, context) => (
            <GenericSidebarWidget
                sdk={sdk}
                context={context}
                entityType="user"
                entityId={context.userId}
                title="JSON-LD Structured Data"
                description="Generate Person, Organization, or Brand schema"
            />
        ),
        'system:plugin:settings-panel': (sdk, _prev, context) => <GlobalSettingsPanel sdk={sdk} context={context}/>
    },
    hasSettingsPanel: true
});