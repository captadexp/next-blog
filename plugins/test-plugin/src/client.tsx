import {defineClient} from '@supergrowthai/plugin-dev-kit';

// Helper component for displaying hook indicators
const HookIndicator = ({hookName}: { hookName: string }) => {
    return (
        <div
            className="inline-flex items-center justify-center w-6 h-6 bg-green-500 rounded-full cursor-pointer"
            title={hookName}
        >
            <span className="text-white text-xs font-bold">•</span>
        </div>
    );
};

export default defineClient({
    hooks: {
        // Dashboard event hooks (console logging)
        'dashboard:beforeRender': (sdk, prev, context) => {
            console.log('🔵 Hook: dashboard:beforeRender', context);
            return prev;
        },

        'dashboard:afterRender': (sdk, prev, context) => {
            console.log('🔵 Hook: dashboard:afterRender', context);
            return prev;
        },

        // Blog event hooks (console logging)
        'blog:beforeEdit': (sdk, prev, context) => {
            console.log('🔵 Hook: blog:beforeEdit', context);
            return prev;
        },

        'blog:afterEdit': (sdk, prev, context) => {
            console.log('🔵 Hook: blog:afterEdit', context);
            return prev;
        },

        // Dashboard position hooks - Blogs page
        'dashboard-blogs-header': (sdk, prev, context) => {
            return <HookIndicator hookName="dashboard-blogs-header"/>;
        },

        'dashboard-blogs-footer': (sdk, prev, context) => {
            return <HookIndicator hookName="dashboard-blogs-footer"/>;
        },

        'dashboard-blogs-sidebar': (sdk, prev, context) => {
            return <HookIndicator hookName="dashboard-blogs-sidebar"/>;
        },

        // Dashboard position hooks - Users page
        'dashboard-users-header': (sdk, prev, context) => {
            return <HookIndicator hookName="dashboard-users-header"/>;
        },

        'dashboard-users-footer': (sdk, prev, context) => {
            return <HookIndicator hookName="dashboard-users-footer"/>;
        },

        'dashboard-users-sidebar': (sdk, prev, context) => {
            return <HookIndicator hookName="dashboard-users-sidebar"/>;
        },

        // Dashboard position hooks - Settings page
        'dashboard-settings-header': (sdk, prev, context) => {
            return <HookIndicator hookName="dashboard-settings-header"/>;
        },

        'dashboard-settings-footer': (sdk, prev, context) => {
            return <HookIndicator hookName="dashboard-settings-footer"/>;
        },

        // Dashboard position hooks - Plugins page
        'dashboard-plugins-header': (sdk, prev, context) => {
            return <HookIndicator hookName="dashboard-plugins-header"/>;
        },

        'dashboard-plugins-footer': (sdk, prev, context) => {
            return <HookIndicator hookName="dashboard-plugins-footer"/>;
        },

        // Editor position hooks - Blog editor
        'editor-blog-toolbar': (sdk, prev, context) => {
            return <HookIndicator hookName="editor-blog-toolbar"/>;
        },

        'editor-blog-sidebar': (sdk, prev, context) => {
            return <HookIndicator hookName="editor-blog-sidebar"/>;
        },

        'editor-blog-footer': (sdk, prev, context) => {
            return <HookIndicator hookName="editor-blog-footer"/>;
        },

        // Editor position hooks - Page editor
        'editor-page-toolbar': (sdk, prev, context) => {
            return <HookIndicator hookName="editor-page-toolbar"/>;
        },

        'editor-page-sidebar': (sdk, prev, context) => {
            return <HookIndicator hookName="editor-page-sidebar"/>;
        },

        // Editor sidebar widget
        'editor-sidebar-widget': (sdk, prev, context) => {
            return (
                <div className="p-2 border rounded">
                    <HookIndicator hookName="editor-sidebar-widget"/>
                    <span className="ml-2 text-xs">Widget</span>
                </div>
            );
        },
        
        // Dashboard panel for plugin settings (requires hasSettingsPanel: true)
        'dashboard-panel-my-plugin': (sdk) => {
            return (
                <div className="p-4">
                    <h2 className="text-xl font-bold mb-4">Test Plugin Panel</h2>
                    <div className="flex items-center space-x-2 mb-4">
                        <HookIndicator hookName="dashboard-panel-test-plugin"/>
                        <span className="text-sm">This is the plugin settings panel hook</span>
                    </div>
                    <button
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        onClick={async () => {
                            try {
                                const response = await sdk.callHook('test-plugin:ping', { timestamp: Date.now() });
                                console.log('🟡 RPC Response:', response);
                                sdk.notify('RPC test successful!', 'success');
                            } catch (error) {
                                console.error('RPC error:', error);
                                sdk.notify('RPC test failed', 'error');
                            }
                        }}
                    >
                        Test RPC Call
                    </button>
                </div>
            );
        },
        
        // ExtensionZone hooks - Dashboard Home
        'dashboard-home:before': () => <HookIndicator hookName="dashboard-home:before"/>,
        'dashboard-home:after': () => <HookIndicator hookName="dashboard-home:after"/>,
        'stats-section:before': () => <HookIndicator hookName="stats-section:before"/>,
        'stats-section:after': () => <HookIndicator hookName="stats-section:after"/>,
        'quick-draft:before': () => <HookIndicator hookName="quick-draft:before"/>,
        'quick-draft:after': () => <HookIndicator hookName="quick-draft:after"/>,
        
        // ExtensionZone hooks - Blogs Page
        'blogs-list:before': () => <HookIndicator hookName="blogs-list:before"/>,
        'blogs-list:after': () => <HookIndicator hookName="blogs-list:after"/>,
        'blog-table:before': () => <HookIndicator hookName="blog-table:before"/>,
        'blog-table:after': () => <HookIndicator hookName="blog-table:after"/>,
        
        // ExtensionZone hooks - Users Page
        'users-list:before': () => <HookIndicator hookName="users-list:before"/>,
        'users-list:after': () => <HookIndicator hookName="users-list:after"/>,
        'user-table:before': () => <HookIndicator hookName="user-table:before"/>,
        'user-table:after': () => <HookIndicator hookName="user-table:after"/>,
        
        // ExtensionZone hooks - Categories Page
        'categories-list:before': () => <HookIndicator hookName="categories-list:before"/>,
        'categories-list:after': () => <HookIndicator hookName="categories-list:after"/>,
        'categories-table:before': () => <HookIndicator hookName="categories-table:before"/>,
        'categories-table:after': () => <HookIndicator hookName="categories-table:after"/>,
        
        // ExtensionZone hooks - Tags Page
        'tags-list:before': () => <HookIndicator hookName="tags-list:before"/>,
        'tags-list:after': () => <HookIndicator hookName="tags-list:after"/>,
        'tags-table:before': () => <HookIndicator hookName="tags-table:before"/>,
        'tags-table:after': () => <HookIndicator hookName="tags-table:after"/>,
        
        // ExtensionZone hooks - Settings Page
        'settings-list:before': () => <HookIndicator hookName="settings-list:before"/>,
        'settings-list:after': () => <HookIndicator hookName="settings-list:after"/>,
        'settings-table:before': () => <HookIndicator hookName="settings-table:before"/>,
        'settings-table:after': () => <HookIndicator hookName="settings-table:after"/>,
        
        // ExtensionZone hooks - Plugins Page
        'plugins-list:before': () => <HookIndicator hookName="plugins-list:before"/>,
        'plugins-list:after': () => <HookIndicator hookName="plugins-list:after"/>,
        'plugins-table:before': () => <HookIndicator hookName="plugins-table:before"/>,
        'plugins-table:after': () => <HookIndicator hookName="plugins-table:after"/>,
        
        // ExtensionPoint hooks - Toolbar hooks
        'blogs-list-toolbar': () => <HookIndicator hookName="blogs-list-toolbar"/>,
        'users-list-toolbar': () => <HookIndicator hookName="users-list-toolbar"/>,
        'categories-list-toolbar': () => <HookIndicator hookName="categories-list-toolbar"/>,
        'tags-list-toolbar': () => <HookIndicator hookName="tags-list-toolbar"/>,
        'settings-list-toolbar': () => <HookIndicator hookName="settings-list-toolbar"/>,
        'plugins-list-toolbar': () => <HookIndicator hookName="plugins-list-toolbar"/>,
        
        // Form ExtensionZone hooks - Blog forms
        'blog-create-form:before': () => <HookIndicator hookName="blog-create-form:before"/>,
        'blog-create-form:after': () => <HookIndicator hookName="blog-create-form:after"/>,
        'blog-update-form:before': () => <HookIndicator hookName="blog-update-form:before"/>,
        'blog-update-form:after': () => <HookIndicator hookName="blog-update-form:after"/>,
        
        // Form ExtensionZone hooks - User forms
        'user-create-form:before': () => <HookIndicator hookName="user-create-form:before"/>,
        'user-create-form:after': () => <HookIndicator hookName="user-create-form:after"/>,
        'user-update-form:before': () => <HookIndicator hookName="user-update-form:before"/>,
        'user-update-form:after': () => <HookIndicator hookName="user-update-form:after"/>,
        
        // Form ExtensionZone hooks - Category forms
        'category-create-form:before': () => <HookIndicator hookName="category-create-form:before"/>,
        'category-create-form:after': () => <HookIndicator hookName="category-create-form:after"/>,
        'category-update-form:before': () => <HookIndicator hookName="category-update-form:before"/>,
        'category-update-form:after': () => <HookIndicator hookName="category-update-form:after"/>,
        
        // Form ExtensionZone hooks - Tag forms
        'tag-create-form:before': () => <HookIndicator hookName="tag-create-form:before"/>,
        'tag-create-form:after': () => <HookIndicator hookName="tag-create-form:after"/>,
        'tag-update-form:before': () => <HookIndicator hookName="tag-update-form:before"/>,
        'tag-update-form:after': () => <HookIndicator hookName="tag-update-form:after"/>,
        
        // Form ExtensionZone hooks - Settings forms
        'setting-create-form:before': () => <HookIndicator hookName="setting-create-form:before"/>,
        'setting-create-form:after': () => <HookIndicator hookName="setting-create-form:after"/>,
        'setting-update-form:before': () => <HookIndicator hookName="setting-update-form:before"/>,
        'setting-update-form:after': () => <HookIndicator hookName="setting-update-form:after"/>,
        
        // Form ExtensionZone hooks - Plugin forms
        'plugin-create-form:before': () => <HookIndicator hookName="plugin-create-form:before"/>,
        'plugin-create-form:after': () => <HookIndicator hookName="plugin-create-form:after"/>,
        
        // List item hooks - For individual items in tables
        'blog-item:before': () => <HookIndicator hookName="blog-item:before"/>,
        'blog-item:after': () => <HookIndicator hookName="blog-item:after"/>,
        'user-item:before': () => <HookIndicator hookName="user-item:before"/>,
        'user-item:after': () => <HookIndicator hookName="user-item:after"/>,
        'category-item:before': () => <HookIndicator hookName="category-item:before"/>,
        'category-item:after': () => <HookIndicator hookName="category-item:after"/>,
        'tag-item:before': () => <HookIndicator hookName="tag-item:before"/>,
        'tag-item:after': () => <HookIndicator hookName="tag-item:after"/>,
        'setting-item:before': () => <HookIndicator hookName="setting-item:before"/>,
        'setting-item:after': () => <HookIndicator hookName="setting-item:after"/>,
        'plugin-item:before': () => <HookIndicator hookName="plugin-item:before"/>,
        'plugin-item:after': () => <HookIndicator hookName="plugin-item:after"/>,
    },
    hasSettingsPanel: true
});