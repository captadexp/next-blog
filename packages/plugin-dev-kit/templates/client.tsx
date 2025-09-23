import {defineClient} from '@supergrowthai/plugin-dev-kit';

// Client-side hooks that run in the browser
export default defineClient({
    hooks: {
        // Hook into dashboard home page
        'dashboard-home:before': (sdk, prev, context) => {
            return (
                <div className="p-4 bg-blue-100 rounded-lg mb-4">
                    <h2 className="text-xl font-bold mb-2">Welcome from My Plugin!</h2>
                    <p>Hello, {sdk.user?.username || 'Guest'}!</p>
                    <button
                        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        onClick={() => sdk.notify('Hello from my plugin!', 'success')}
                    >
                        Show Notification
                    </button>
                </div>
            );
        },

        // Add content after blogs list
        'blogs-list:after': (sdk, prev, context) => {
            const blogCount = context?.data?.length || 0;
            return (
                <div className="mt-4 p-3 bg-gray-100 rounded">
                    <p className="text-sm text-gray-600">
                        📊 Total blogs: {blogCount}
                    </p>
                </div>
            );
        },

        // Dashboard panel for plugin settings (if hasSettingsPanel: true)
        'dashboard-panel-my-plugin': (sdk, prev, context) => {
            return (
                <div className="container mx-auto p-6">
                    <h1 className="text-3xl font-bold mb-4">My Plugin Settings</h1>
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Configuration</h2>
                        <p className="text-gray-600 mb-4">
                            Configure your plugin settings here.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Plugin Status
                                </label>
                                <div className="flex items-center space-x-2">
                                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                                    <span className="text-sm">Active</span>
                                </div>
                            </div>

                            <button
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                onClick={async () => {
                                    // Call server RPC
                                    try {
                                        const response = await sdk.callHook('myPlugin:getData', {});
                                        sdk.notify('Data loaded successfully', 'success');
                                    } catch (error) {
                                        sdk.notify('Failed to load data', 'error');
                                    }
                                }}
                            >
                                Test Server RPC
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
    }
});