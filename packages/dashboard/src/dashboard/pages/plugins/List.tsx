import {h} from 'preact';
import {useUser} from '../../../context/UserContext';
import {PaginatedResponse, Plugin} from '@supergrowthai/next-blog-types';
import {usePlugins} from "../../../context/PluginContext.tsx";
import {useLocation} from "preact-iso";
import {useEffect, useState} from "preact/hooks";
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';
import {usePagination} from '../../../hooks/usePagination';
import {PaginationControls} from '../../../components/PaginationControls';

const PluginsList = () => {
    const {hasPermission, hasAllPermissions, apis: api, user} = useUser();
    const {loadedPlugins, hardReloadPlugins} = usePlugins();
    const location = useLocation();
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginatedResponse<Plugin> | null>(null);

    const {page, setPage, getParams} = usePagination();

    const fetchPlugins = async () => {
        try {
            const params = getParams();
            const response = await api.getPlugins(params);

            if (response.code === 0 && response.payload) {
                setPlugins(response.payload.data);
                setPagination(response.payload);
            } else {
                throw new Error(response.message || 'Failed to fetch plugins');
            }
            setLoading(false);
        } catch (err) {
            console.error('Error fetching plugins:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setLoading(false);
        }
    };

    const handleReinstall = async (id: string) => {
        if (!window.confirm('Are you sure you want to reinstall this plugin? This will re-run its installation script.')) {
            return;
        }
        try {
            const response = await api.reinstallPlugin(id);
            if (response.code === 0) {
                hardReloadPlugins();
                fetchPlugins();
            } else {
                alert(`Error: ${response.message}`);
            }
        } catch (err: any) {
            alert(`An error occurred: ${err.message}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this plugin? This will also delete all hook mappings for this plugin.')) {
            return;
        }
        try {
            const response = await api.deletePlugin(id);
            if (response.code === 0) {
                hardReloadPlugins();
                fetchPlugins();
            } else {
                alert(`Error: ${response.message}`);
            }
        } catch (err: any) {
            alert(`An error occurred: ${err.message}`);
        }
    };

    const columns = [
        {
            header: 'Name',
            accessor: 'name',
            cell: (plugin: Plugin) => (
                <div>
                    <div className="font-medium">{plugin.name}</div>
                    {plugin.url && (
                        <div className="text-xs text-gray-500 mt-1">{plugin.url}</div>
                    )}
                </div>
            )
        },
        {header: 'Version', accessor: 'version'},
        {header: 'Author', accessor: 'author'},
        {
            header: 'Actions',
            accessor: '_id',
            cell: (plugin: Plugin) => {
                const clientModule = loadedPlugins.get(plugin._id);
                const hasSettingsPanel = clientModule?.hasSettingsPanel;

                return (
                    <div className="flex space-x-2">
                        {hasSettingsPanel && (
                            <button
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                onClick={() => location.route(`/api/next-blog/dashboard/plugins/${plugin._id}`)}
                            >
                                Settings
                            </button>
                        )}
                        {hasAllPermissions(['plugins:create', 'plugins:delete']) && !plugin.isSystem && (
                            <button
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                                onClick={() => handleReinstall(plugin._id)}
                            >
                                Reinstall
                            </button>
                        )}
                        {hasPermission('plugins:delete') && !plugin.isSystem && (
                            <button
                                className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                                onClick={() => handleDelete(plugin._id)}
                            >
                                Delete
                            </button>
                        )}
                    </div>
                )
            },
        },
    ];

    useEffect(() => {
        if (location.query.r === '1') {
            console.log("Detected a refresh request")
            hardReloadPlugins();
            fetchPlugins();
            const {r, ...rest} = location.query;
            const qs = new URLSearchParams(rest as Record<string, string>).toString();
            location.route(location.path + (qs ? `?${qs}` : ''), /* replaceHistory */ true);
        }
    }, [location.query.r]);

    useEffect(() => {
        fetchPlugins();
    }, [page]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <ExtensionZone name="plugins-list" context={{zone: 'plugins-list', page: 'plugins', data: plugins}}>
            <div className="p-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Plugins</h1>
                    {hasPermission('plugins:create') && (
                        <a
                            href="/api/next-blog/dashboard/plugins/create"
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Add New Plugin
                        </a>
                    )}
                </div>

                <ExtensionPoint name="plugins-list-toolbar" context={{plugins, loadedPlugins}}/>

                {error ? (
                    <div className="p-4 bg-red-100 text-red-800 rounded">
                        Error: {error}
                    </div>
                ) : plugins.length === 0 ? (
                    <div className="text-gray-500">No plugins found.</div>
                ) : (
                    <ExtensionZone name="plugins-table"
                                   context={{zone: 'plugins-table', page: 'plugins', data: {plugins, loadedPlugins}}}>
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200">
                                <thead>
                                <tr className="bg-gray-100">
                                    {columns.map((column) => (
                                        <th key={column.header}
                                            className="py-2 px-4 border-b text-left">{column.header}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {plugins.map((plugin: any) => (
                                    <>
                                        <ExtensionPoint name="plugin-item:before" context={{plugin}}/>
                                        <tr key={plugin._id} className="hover:bg-gray-50">
                                            {columns.map((column) => (
                                                <td key={column.accessor} className="py-2 px-4 border-b">
                                                    {column.cell ? column.cell(plugin) : plugin[column.accessor]}
                                                </td>
                                            ))}
                                        </tr>
                                        <ExtensionPoint name="plugin-item:after" context={{plugin}}/>
                                    </>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </ExtensionZone>
                )}

                <PaginationControls
                    pagination={pagination}
                    currentPage={page}
                    dataLength={plugins.length}
                    onPageChange={setPage}
                />
            </div>
        </ExtensionZone>
    );
};

export default PluginsList;
