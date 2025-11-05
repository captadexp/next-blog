import {defineClient} from '@supergrowthai/plugin-dev-kit';
import type {
    BlogEditorContext,
    CategoryEditorContext,
    ClientSDK,
    TagEditorContext,
    UserEditorContext
} from '@supergrowthai/plugin-dev-kit/client';
import {BlogSidebarWidget} from './components/BlogSidebarWidget.js';
import {GlobalSettingsPanel} from './components/GlobalSettingsPanel.js';
import {GenericSidebarWidget} from './components/GenericSidebarWidget.js';
import "./styles.css"

export default defineClient({
    hooks: {
        'blog-update-sidebar-widget': (sdk, _prev, context) => <BlogSidebarWidget sdk={sdk} context={context}/>,
        'tag-update-sidebar-widget': (sdk, _prev, context) => <GenericSidebarWidget sdk={sdk} context={context} type="tags" _id={context.tagId}/>,
        'category-update-sidebar-widget': (sdk, _prev, context) => <GenericSidebarWidget sdk={sdk} context={context} type="categories" _id={context.categoryId}/>,
        'user-update-sidebar-widget': (sdk, _prev, context) => <GenericSidebarWidget sdk={sdk} context={context} type="users" _id={context.userId}/>,
        'system:plugin:settings-panel': (sdk, _prev, context) => <GlobalSettingsPanel sdk={sdk} context={context}/>
    },
    hasSettingsPanel: true
});