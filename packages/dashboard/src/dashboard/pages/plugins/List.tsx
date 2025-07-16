import {h} from 'preact';
import {useUser} from '../../../context/UserContext';
import {Plugin} from '../../../types/api';
import {usePlugins} from "../../../context/PluginContext.tsx";
import {useLocation} from "preact-iso";
import {useEffect} from "preact/hooks";

const PluginsList = () => {
    const {hasPermission, hasAllPermissions, apis: api} = useUser();
    const {plugins, loadedPlugins, status: pluginStatus, hardReloadPlugins} = usePlugins();
    const location = useLocation();

    const handleReinstall = async (id: string) => {
        if (!window.confirm('Are you sure you want to reinstall this plugin? This will re-run its installation script.')) {
            return;
        }
        try {
            const response = await api.reinstallPlugin(id);
            if (response.code === 0) {
                hardReloadPlugins();
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
                hardReloadPlugins()
            } else {
                alert(`Error: ${response.message}`);
            }
        } catch (err: any) {
            alert(`An error occurred: ${err.message}`);
        }
    };

    const columns = [
        {header: 'Name', accessor: 'name'},
        {header: 'Version', accessor: 'version'},
        {header: 'Author', accessor: 'author'},
        {
            header: 'Actions',
            accessor: '_id',
            cell: (plugin: Plugin) => {
                const clientModule = loadedPlugins.get(plugin._id);
                const hasPanel = clientModule?.hasPanel;

                return (
                    <div className="flex space-x-2">
                        {hasPanel && (
                            <button
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                onClick={() => location.route(`/api/next-blog/dashboard/plugins/${plugin._id}`)}
                            >
                                Settings
                            </button>
                        )}
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
                )
            },
        },
    ];

    useEffect(() => {
        if (location.query.r === '1') {
            console.log("Detected a refresh request")
            hardReloadPlugins();
            const {r, ...rest} = location.query;
            const qs = new URLSearchParams(rest as Record<string, string>).toString();
            location.route(location.path + (qs ? `?${qs}` : ''), /* replaceHistory */ true);
        }
    }, [location.query.r]);

    if (pluginStatus !== 'ready') {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
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

            {plugins.length === 0 ? (
                <div className="text-gray-500">No plugins found.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200">
                        <thead>
                        <tr className="bg-gray-100">
                            {columns.map((column) => (
                                <th key={column.header} className="py-2 px-4 border-b text-left">{column.header}</th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {plugins.map((plugin: any) => (
                            <tr key={plugin._id} className="hover:bg-gray-50">
                                {columns.map((column) => (
                                    <td key={column.accessor} className="py-2 px-4 border-b">
                                        {column.cell ? column.cell(plugin) : plugin[column.accessor]}
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
