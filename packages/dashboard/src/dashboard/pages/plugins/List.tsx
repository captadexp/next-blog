import {h} from 'preact';
import {useUser} from '../../../context/UserContext';
import {Plugin} from '@supergrowthai/types';
import {usePlugins} from "../../../context/PluginContext.tsx";
import {useLocation} from "preact-iso";
import {useEffect, useState} from "preact/hooks";
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';
import {AvailablePlugins} from "../../components/plugins/AvailablePlugins.tsx";

const InstalledPlugins = () => {
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
        <ExtensionZone name="plugins-list" page="plugins" data={plugins}>
            <div className="p-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Installed Plugins</h1>
                </div>

                <ExtensionPoint name="plugins-list-toolbar" context={{plugins, loadedPlugins}}/>

                {plugins.length === 0 ? (
                    <div className="text-gray-500">No plugins found.</div>
                ) : (
                    <ExtensionZone name="plugins-table" page="plugins" data={{plugins, loadedPlugins}}>
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
            </div>
        </ExtensionZone>
    );
};

const CreatePlugin = () => {
    const {apis: api} = useUser();
    const {route} = useLocation();
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [url, setUrl] = useState<string>('');

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await api.createPlugin({url});
            if (response.code === 0) {
                route('/api/next-blog/dashboard/plugins?r=1');
            } else {
                setError(response.message || 'Failed to create plugin');
            }
        } catch (err) {
            setError('An error occurred while creating the plugin');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Install Plugin</h2>
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

            {/* Custom URL Section */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-4">Install from URL</h3>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="url">
                            Plugin URL
                        </label>
                        <input
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            id="url"
                            type="text"
                            name="url"
                            value={url}
                            onChange={(e: any) => setUrl(e.target.value)}
                            placeholder="https://example.com/plugin.js"
                            required
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-50"
                            onClick={() => route('/api/next-blog/dashboard/plugins')}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <div className="inline-block animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></div>
                                    Installing...
                                </span>
                            ) : (
                                'Install Plugin'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const PluginsList = () => {
    const [activeTab, setActiveTab] = useState('installed');

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Plugins</h1>
                <div className="flex border-b">
                    <button
                        className={`px-4 py-2 ${activeTab === 'installed' ? 'border-b-2 border-blue-500' : ''}`}
                        onClick={() => setActiveTab('installed')}
                    >
                        Installed
                    </button>
                    <button
                        className={`px-4 py-2 ${activeTab === 'all' ? 'border-b-2 border-blue-500' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        All
                    </button>
                    <button
                        className={`px-4 py-2 ${activeTab === 'install' ? 'border-b-2 border-blue-500' : ''}`}
                        onClick={() => setActiveTab('install')}
                    >
                        Install
                    </button>
                </div>
            </div>
            <div className="pt-4">
                {activeTab === 'installed' && <InstalledPlugins />}
                {activeTab === 'all' && <AvailablePlugins />}
                {activeTab === 'install' && <CreatePlugin />}
            </div>
        </div>
    );
}

export default PluginsList;