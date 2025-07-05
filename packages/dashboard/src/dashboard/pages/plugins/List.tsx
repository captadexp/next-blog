import {h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {useUser} from '../../../context/UserContext';
import {Plugin} from '../../../types/api';
import {pluginCache} from "../../../utils/pluginCache.ts";

const PluginsList = () => {
    const {hasPermission, hasAllPermissions, apis: api} = useUser();
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPlugins = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.getPlugins();
            if (response.code === 0 && Array.isArray(response.payload)) {
                setPlugins(response.payload);
            } else {
                setError(response.message || 'Failed to fetch plugins');
            }
        } catch (err) {
            setError('An error occurred while fetching plugins');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlugins();
    }, []);

    const handleReinstall = async (id: string) => {
        if (!window.confirm('Are you sure you want to reinstall this plugin? This will re-run its installation script.')) {
            return;
        }

        try {
            const response = await api.reinstallPlugin(id);
            if (response.code === 0) {
                if (response.payload?.clearCache) {
                    // Clear IndexedDB cache in dev mode or on reinstall

                    await pluginCache.clear();
                }
                await fetchPlugins();
            } else {
                setError(response.message || 'Failed to reinstall plugin');
            }
        } catch (err) {
            setError('An error occurred while reinstalling the plugin');
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this plugin? This will also delete all hook mappings for this plugin.')) {
            return;
        }

        try {
            const response = await api.deletePlugin(id);
            if (response.code === 0) {
                await fetchPlugins();
            } else {
                setError(response.message || 'Failed to delete plugin');
            }
        } catch (err) {
            setError('An error occurred while deleting the plugin');
            console.error(err);
        }
    };

    const columns = [
        {
            header: 'Name',
            accessor: 'name',
        },
        {
            header: 'Version',
            accessor: 'version',
        },
        {
            header: 'Author',
            accessor: 'author',
        },
        {
            header: 'Actions',
            accessor: '_id',
            cell: (plugin: Plugin) => (
                <div className="flex space-x-2">
                    {hasAllPermissions(['plugins:create', 'plugins:delete']) && (
                        <button
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                            onClick={() => handleReinstall(plugin._id)}
                        >
                            Reinstall
                        </button>
                    )}
                    {hasPermission('plugins:delete') && (
                        <button
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                            onClick={() => handleDelete(plugin._id)}
                        >
                            Delete
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Plugins</h2>
                {hasPermission('plugins:create') && (
                    <a href="/api/next-blog/dashboard/plugins/create">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                            Add New Plugin
                        </button>
                    </a>
                )}
            </div>

            {error && (
                <div className="p-4 mb-4 bg-red-100 text-red-800 rounded-md flex justify-between items-center">
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-600 hover:text-red-800"
                    >
                        ×
                    </button>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : plugins.length === 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                    <p className="text-gray-600 mb-4">No plugins found.</p>
                    {hasPermission('plugins:create') && (
                        <a href="/api/next-blog/dashboard/plugins/create">
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                Add Your First Plugin
                            </button>
                        </a>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                        <tr>
                            {columns.map((column, index) => (
                                <th
                                    key={index}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {plugins.map((plugin, rowIndex) => (
                            <tr key={plugin._id} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                {columns.map((column, colIndex) => (
                                    <td key={`${plugin._id}-${colIndex}`} className="px-6 py-4 whitespace-nowrap">
                                        {column.cell ? column.cell(plugin) : (plugin as any)[column.accessor]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PluginsList;
