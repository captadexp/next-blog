import {h} from 'preact';
import {useUser} from '../../../context/UserContext';
import {Plugin} from '@supergrowthai/next-blog-types';
import {usePlugins} from "../../../context/PluginContext.tsx";
import {useLocation} from "preact-iso";
import {useEffect, useState} from "preact/hooks";
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';
import {PaginationControls} from '../../../components/PaginationControls';
import Loader from '../../../components/Loader';
import {useEntityList} from '../../../hooks/useEntityList';
import ListPage from '../../../components/ListPageLayout';

const PluginsList = () => {
    const {hasPermission, hasAllPermissions, apis: api} = useUser();
    const {loadedPlugins, hardReloadPlugins} = usePlugins();
    const location = useLocation();
    const [isReloading, setIsReloading] = useState(false);

    const {
        entities: plugins,
        paginationLoading,
        error,
        pagination,
        deletingIds,
        actioningIds,
        handlePageChange,
        handleDelete,
        actionHandlers,
        page
    } = useEntityList<Plugin>({
        fetchFn: api.getPlugins.bind(api),
        deleteFn: api.deletePlugin.bind(api),
        entityName: 'plugin',
        additionalActions: {
            reinstall: {
                fn: async (id: string) => {
                    const response = await api.reinstallPlugin(id);
                    if (response.code === 0) {
                        hardReloadPlugins();
                    }
                    return response;
                },
                confirmMessage: 'Are you sure you want to reinstall this plugin? This will re-run its installation script.'
            }
        }
    });

    const reinstallingIds = actioningIds.reinstall || new Set();
    const handleReinstall = actionHandlers.reinstall;

    const handleReloadPlugins = async () => {
        setIsReloading(true);
        try {
            await hardReloadPlugins();
        } finally {
            setIsReloading(false);
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
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                onClick={() => handleReinstall(plugin._id)}
                                disabled={reinstallingIds.has(plugin._id)}
                            >
                                {reinstallingIds.has(plugin._id) ? <Loader size="sm" text=""/> : 'Reinstall'}
                            </button>
                        )}
                        {hasPermission('plugins:delete') && !plugin.isSystem && (
                            <button
                                className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                                onClick={() => handleDelete(plugin, 'Are you sure you want to delete this plugin? This will also delete all hook mappings for this plugin.')}
                                disabled={deletingIds.has(plugin._id)}
                            >
                                {deletingIds.has(plugin._id) ? <Loader size="sm" text=""/> : 'Delete'}
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

    return (
        <ExtensionZone name="plugins-list" context={{data: plugins}}>
            <div className="p-4">
                <ListPage paginationLoading={paginationLoading}>
                    <ListPage.Header>
                        <h1 className="text-2xl font-bold">Plugins</h1>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleReloadPlugins}
                                disabled={isReloading}
                                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                                title="Clear cache and reload all plugins"
                            >
                                {isReloading ? <Loader size="sm" text=""/> : 'Reload Plugins'}
                            </button>
                            {hasPermission('plugins:create') && (
                                <a
                                    href="/api/next-blog/dashboard/plugins/create"
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    Add New Plugin
                                </a>
                            )}
                        </div>
                    </ListPage.Header>

                    <ExtensionPoint name="plugins-list-toolbar" context={{plugins, loadedPlugins}}/>

                    <ListPage.Content
                        loading={paginationLoading}
                        error={error}
                        empty={plugins.length === 0}
                        emptyMessage="No plugins found."
                    >
                        <ExtensionZone name="plugins-table" context={{data: {plugins, loadedPlugins}}}>
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
                    </ListPage.Content>

                    <PaginationControls
                        pagination={pagination}
                        currentPage={page}
                        dataLength={plugins.length}
                        onPageChange={handlePageChange}
                        loading={paginationLoading}
                    />
                </ListPage>
            </div>
        </ExtensionZone>
    );
};

export default PluginsList;
