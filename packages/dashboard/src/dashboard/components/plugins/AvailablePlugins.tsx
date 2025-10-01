import {h} from 'preact';
import {useEffect, useMemo, useState} from 'preact/hooks';
import {useUser} from "../../../context/UserContext.tsx";
import {useLocation} from "preact-iso";
import {usePlugins} from "../../../context/PluginContext.tsx";

interface AvailablePlugin {
    id: string;
    name: string;
    version: string;
    author: string;
    path: string;
    files: {
        client: string;
        server: string;
        plugin: string;
    };
    description: string;
}

export const AvailablePlugins = () => {
    const {apis: api} = useUser();
    const {route} = useLocation();
    const {plugins: installedPlugins} = usePlugins();
    const [installingPlugin, setInstallingPlugin] = useState<string | null>(null);
    const [availablePlugins, setAvailablePlugins] = useState<AvailablePlugin[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Create a map of installed plugin IDs for quick lookup
    const installedPluginIds = useMemo(() => {
        return new Set(installedPlugins.map(p => p.name.toLowerCase().replace(/\s+/g, '-')));
    }, [installedPlugins]);

    useEffect(() => {
        const fetchAvailablePlugins = async () => {
            try {
                const response = await fetch('https://next-blog-test-app.vercel.app/plugins/available.json');
                if (response.ok) {
                    const data = await response.json();
                    setAvailablePlugins(data.plugins || []);
                }
            } catch (err) {
                console.error('Failed to fetch available plugins:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAvailablePlugins();
    }, []);

    const handleInstall = async (plugin: AvailablePlugin) => {
        setInstallingPlugin(plugin.id);
        setError(null);

        try {
            // Construct the full URL for the plugin
            const pluginUrl = plugin.files.plugin;
            const response = await api.createPlugin({url: pluginUrl});
            if (response.code === 0) {
                route('/api/next-blog/dashboard/plugins?r=1');
            } else {
                setError(response.message || 'Failed to install plugin');
            }
        } catch (err) {
            setError('An error occurred while installing the plugin');
            console.error(err);
        } finally {
            setInstallingPlugin(null);
        }
    };

    if (loading) {
        return (
            <div className="mb-8">
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }

    if (availablePlugins.length === 0) {
        return null;
    }

    return (
        <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Available Plugins</h3>

            {error && (
                <div className="p-3 mb-4 bg-red-100 text-red-800 rounded-md text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {availablePlugins.map((plugin) => {
                    const isInstalled = installedPluginIds.has(plugin.id);
                    return (
                        <div key={plugin.id}
                             className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col h-48">
                            <div className="flex-1 overflow-hidden">
                                <h4 className="text-base font-semibold mb-1 truncate" title={plugin.name}>
                                    {plugin.name}
                                </h4>
                                <p className="text-xs text-gray-600 mb-1">
                                    v{plugin.version} • {plugin.author}
                                </p>
                                <p className="text-xs text-gray-700 line-clamp-3">
                                    {plugin.description}
                                </p>
                            </div>
                            <div className="mt-auto pt-3">
                                {isInstalled ? (
                                    <div
                                        className="w-full px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md text-center text-sm font-medium">
                                        Installed
                                    </div>
                                ) : (
                                    <button
                                        className="w-full px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                        onClick={() => handleInstall(plugin)}
                                        disabled={installingPlugin === plugin.id}
                                    >
                                        {installingPlugin === plugin.id ? (
                                            <span className="flex items-center justify-center">
                                                <div
                                                    className="inline-block animate-spin h-3 w-3 border-t-2 border-b-2 border-white rounded-full mr-1.5"></div>
                                                Installing...
                                            </span>
                                        ) : (
                                            'Install'
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};