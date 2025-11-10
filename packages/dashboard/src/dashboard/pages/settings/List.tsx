import {FunctionComponent, h} from 'preact';
import {useLocation} from 'preact-iso';
import {useState} from 'preact/hooks';
import {useUser} from '../../../context/UserContext';
import {ExtendedSettingsEntry} from '@supergrowthai/next-blog-types';
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';
import {PaginationControls} from '../../../components/PaginationControls';
import Loader from '../../../components/Loader';
import {useEntityList} from '../../../hooks/useEntityList';
import ListPage from '../../../components/ListPageLayout';

interface SettingsListProps {
    path?: string;
}

const SettingsList: FunctionComponent<SettingsListProps> = () => {
    const location = useLocation();
    const {apis, hasPermission} = useUser();

    const urlParams = new URLSearchParams(window.location.search);
    const [search, setSearch] = useState(urlParams.get('search') || '');

    const updateSearchURL = (newSearch: string) => {
        const params = new URLSearchParams(window.location.search);
        if (newSearch) {
            params.set('search', newSearch);
        } else {
            params.delete('search');
        }
        const newURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState({}, '', newURL);
    };

    const {
        entities: settings,
        paginationLoading,
        error,
        pagination,
        deletingIds,
        handlePageChange,
        handleDelete,
        page
    } = useEntityList<ExtendedSettingsEntry>({
        fetchFn: (params) => apis.getSettings({...params, search}),
        deleteFn: apis.deleteSetting.bind(apis),
        entityName: 'setting',
        dependencies: [search]
    });

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString();
    };

    const formatValue = (value: string | boolean | number | boolean[] | string[] | number[], masked?: boolean) => {
        if (masked) {
            return '***';
        }
        if (Array.isArray(value)) {
            return JSON.stringify(value);
        }
        return String(value);
    };

    const handleSearchChange = (newSearch: string) => {
        setSearch(newSearch);
        updateSearchURL(newSearch);
    };

    const searchInput = (
        <div className="mb-4">
            <input
                type="text"
                placeholder="Search settings..."
                value={search}
                onInput={(e) => {
                    handleSearchChange((e.target as HTMLInputElement).value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>
    );

    return (
        <ExtensionZone name="settings-list" context={{data: settings}}>
            <ListPage paginationLoading={paginationLoading}>
                <ListPage.Header>
                    <h2 className="text-xl font-semibold m-0">Settings</h2>
                    {hasPermission('settings:create') && (
                        <a
                            href="/api/next-blog/dashboard/settings/create"
                            onClick={(e) => {
                                e.preventDefault();
                                location.route('/api/next-blog/dashboard/settings/create');
                            }}
                            className="inline-block bg-blue-500 hover:bg-blue-600 text-white no-underline px-4 py-2 rounded"
                        >
                            Create New Setting
                        </a>
                    )}
                </ListPage.Header>

                <ExtensionPoint name="settings-list-toolbar" context={{settings}}/>

                {searchInput}

                <ListPage.Content
                    loading={paginationLoading}
                    error={error}
                    empty={settings.length === 0}
                    emptyMessage="No settings found. Create your first setting!"
                >
                    <ExtensionZone name="settings-table" context={{data: settings}}>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                <tr className="bg-gray-100">
                                    <th className="p-3 text-left border-b border-gray-200">Key</th>
                                    <th className="p-3 text-left border-b border-gray-200">Value</th>
                                    <th className="p-3 text-left border-b border-gray-200">Scope</th>
                                    <th className="p-3 text-left border-b border-gray-200">Created</th>
                                    <th className="p-3 text-left border-b border-gray-200">Updated</th>
                                    <th className="p-3 text-left border-b border-gray-200">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {settings.map(setting => (
                                    <>
                                        <ExtensionPoint name="setting-item:before" context={{setting}}/>
                                        <tr key={setting._id} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="p-3">
                                                {setting.key}
                                                {setting.isSecure && (
                                                    <span className="ml-2 text-yellow-600" title="Secure Setting">🔒</span>
                                                )}
                                                {setting.isOrphaned && (
                                                    <span className="ml-2 text-red-600" title="Orphaned Setting - Plugin Deleted">⚠️</span>
                                                )}
                                            </td>
                                            <td className="p-3">{formatValue(setting.value, setting.masked)}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                    setting.scope === 'global' ? 'bg-green-100 text-green-800' :
                                                        setting.scope === 'user' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-purple-100 text-purple-800'
                                                }`}>
                                                    {setting.scope || 'unknown'}
                                                </span>
                                            </td>
                                            <td className="p-3">{formatDate(setting.createdAt)}</td>
                                            <td className="p-3">{formatDate(setting.updatedAt)}</td>
                                            <td className="p-3">
                                                {hasPermission('settings:update') && (
                                                    <a
                                                        href={`/api/next-blog/dashboard/settings/${setting._id}`}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            location.route(`/api/next-blog/dashboard/settings/${setting._id}`);
                                                        }}
                                                        className="text-blue-500 hover:text-blue-700 no-underline mr-3"
                                                    >
                                                        Edit
                                                    </a>
                                                )}
                                                {hasPermission('settings:delete') && (
                                                    <button
                                                        onClick={() => handleDelete(setting, `Are you sure you want to delete "${setting.key}"?`)}
                                                        disabled={deletingIds.has(setting._id)}
                                                        className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer p-0 font-inherit disabled:opacity-50"
                                                    >
                                                        {deletingIds.has(setting._id) ?
                                                            <Loader size="sm" text=""/> : 'Delete'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                        <ExtensionPoint name="setting-item:after" context={{setting}}/>
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
                    dataLength={settings.length}
                    onPageChange={handlePageChange}
                    loading={paginationLoading}
                />
            </ListPage>
        </ExtensionZone>
    );
};

export default SettingsList;
