import {h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {useUser} from '../../../context/UserContext';
import {Plugin} from '../../../types/api';

const PluginsList = () => {
    const {hasPermission, apis: api} = useUser();
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

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this plugin? This will also delete all hook mappings for this plugin.')) {
            return;
        }

        try {
            const response = await api.deletePlugin(id);
            if (response.code === 0) {
                fetchPlugins();
            } else {
                setError(response.message || 'Failed to delete plugin');
            }
        } catch (err) {
            setError('An error occurred while deleting the plugin');
            console.error(err);
        }
    };

    const getPluginTypeLabel = (type: string) => {
        switch (type) {
            case 'external':
                return <span className="badge bg-blue-500 text-white">External</span>;
            case 'lite':
                return <span className="badge bg-green-500 text-white">Lite</span>;
            case 'browser':
                return <span className="badge bg-purple-500 text-white">Browser</span>;
            default:
                return <span className="badge bg-gray-500 text-white">{type}</span>;
        }
    };

    const columns = [
        {
            header: 'Name',
            accessor: 'name',
            cell: (plugin: Plugin) => (
                <a href={`/api/next-blog/dashboard/plugins/${plugin._id}`} className="text-blue-600 hover:underline">
                    {plugin.name}
                </a>
            ),
        },
        {
            header: 'Type',
            accessor: 'type',
            cell: (plugin: Plugin) => getPluginTypeLabel(plugin.type),
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
                    <a href={`/api/next-blog/dashboard/plugins/${plugin._id}`}>
                        <button
                            className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100">
                            Edit
                        </button>
                    </a>
                    {hasPermission('plugins:delete') && (
                        <button
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                            onClick={() => handleDelete(plugin._id)}
                        >
                            Delete
                        </button>
                    )}
                    <a href={`/api/next-blog/dashboard/plugins/${plugin._id}/hooks`}>
                        <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600">
                            Hooks
                        </button>
                    </a>
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
