import {FunctionComponent, h} from 'preact';
import {useLocation} from 'preact-iso';
import {useEffect, useState} from 'preact/hooks';
import {useUser} from '../../../context/UserContext';
import {SettingsEntry} from '@supergrowthai/types';
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';

interface SettingsListProps {
    path?: string;
}

const SettingsList: FunctionComponent<SettingsListProps> = () => {
    const location = useLocation();
    const {apis, user, hasPermission} = useUser();
    const [settings, setSettings] = useState<SettingsEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Redirect to login if not authenticated
        if (!user && !loading) {
            location.route('/api/next-blog/dashboard/login');
            return;
        }

        // Function to fetch settings from the API
        const fetchSettings = async () => {
            try {
                const response = await apis.getSettings();

                if (response.code === 0 && response.payload) {
                    setSettings(response.payload);
                } else {
                    throw new Error(response.message || 'Failed to fetch settings');
                }
                setLoading(false);
            } catch (err) {
                console.error('Error fetching settings:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };

        fetchSettings();
    }, [user, loading]);

    // Format date for display
    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString();
    };

    // Format value for display
    const formatValue = (value: string | boolean | number | boolean[] | string[] | number[]) => {
        if (Array.isArray(value)) {
            return JSON.stringify(value);
        }
        return String(value);
    };

    return (
        <ExtensionZone name="settings-list" page="settings" data={settings}>
            <div className="flex justify-between items-center mb-5">
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
            </div>

            <ExtensionPoint name="settings-list-toolbar" context={{settings}}/>

            {loading ? (
                <p>Loading settings...</p>
            ) : error ? (
                <div className="p-4 bg-red-100 text-red-800 rounded">
                    Error: {error}
                </div>
            ) : settings.length === 0 ? (
                <p>No settings found. Create your first setting!</p>
            ) : (
                <ExtensionZone name="settings-table" page="settings" data={settings}>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                            <tr className="bg-gray-100">
                                <th className="p-3 text-left border-b border-gray-200">Key</th>
                                <th className="p-3 text-left border-b border-gray-200">Value</th>
                                <th className="p-3 text-left border-b border-gray-200">Owner</th>
                                <th className="p-3 text-left border-b border-gray-200">Created</th>
                                <th className="p-3 text-left border-b border-gray-200">Updated</th>
                                <th className="p-3 text-left border-b border-gray-200">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {settings.map(setting => (
                                <tr key={setting._id} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="p-3">{setting.key}</td>
                                    <td className="p-3">{formatValue(setting.value)}</td>
                                    <td className="p-3">{setting.owner}</td>
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
                                                onClick={async () => {
                                                    if (confirm(`Are you sure you want to delete "${setting.key}"?`)) {
                                                        try {
                                                            const response = await apis.deleteSetting(setting._id);

                                                            if (response.code === 0) {
                                                                // Remove the setting from state
                                                                setSettings(settings.filter(s => s._id !== setting._id));
                                                            } else {
                                                                alert(`Error: ${response.message}`);
                                                            }
                                                        } catch (err) {
                                                            console.error('Error deleting setting:', err);
                                                            alert('Failed to delete setting. Please try again.');
                                                        }
                                                    }
                                                }}
                                                className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer p-0 font-inherit"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </ExtensionZone>
            )}
        </ExtensionZone>
    );
};

export default SettingsList;
