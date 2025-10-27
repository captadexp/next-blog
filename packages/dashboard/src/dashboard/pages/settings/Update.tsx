import {FunctionComponent, h} from 'preact';
import {useEffect, useMemo, useState} from 'preact/hooks';
import {useLocation} from 'preact-iso';
import DynamicForm, {DynamicFormFieldType} from '../../../components/utils/dynamic-form';
import {useUser} from "../../../context/UserContext";
import {SettingEditorContext, SettingsEntry} from '@supergrowthai/next-blog-types';
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';
import {PasswordDynamicFormField, TextAreaDynamicFormField} from "../../../components/utils/dynamic-form/types.ts";

interface SettingsEntryWithScope extends SettingsEntry {
    scope?: 'global' | 'user' | 'plugin';
    masked?: boolean;
}

const UpdateSetting: FunctionComponent<{ id: string }> = ({id}) => {
    const location = useLocation();
    const [setting, setSetting] = useState<SettingsEntryWithScope | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const {apis} = useUser();

    useEffect(() => {
        // Function to fetch setting from the API
        const fetchData = async () => {
            if (!id) {
                setError('No setting ID provided');
                setLoading(false);
                return;
            }

            try {
                // Fetch setting data
                const response = await apis.getSetting(id);

                if (response.code !== 0) {
                    throw new Error(`Error fetching setting: ${response.message}`);
                }

                setSetting(response.payload!);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    // Define form fields based on setting data
    const getFormFields = (): DynamicFormFieldType[] => {
        if (!setting) return [];

        // Format the value for display in the form
        let displayValue = setting.value;
        if (typeof displayValue !== 'string') {
            displayValue = JSON.stringify(displayValue, null, 2);
        }

        // For secure settings, show a password field for new value entry
        const valueField: PasswordDynamicFormField | TextAreaDynamicFormField = setting.isSecure || setting.masked
            ? {
                key: 'value',
                label: 'Value (Secure)',
                type: 'password',
                value: '', // Don't show masked value
                required: true,
                placeholder: 'Enter new value (existing value is hidden for security)'
            }
            : {
                key: 'value',
                label: 'Value',
                type: 'textarea',
                value: displayValue,
                required: true,
                placeholder: 'For arrays or objects, enter valid JSON'
            };

        return [
            {key: 'id', label: 'ID', type: 'text', value: setting._id, disabled: true},
            {key: 'key', label: 'Key', type: 'text', value: setting.key, required: true, disabled: true},
            valueField,
            {
                key: 'scope',
                label: 'Scope',
                type: 'select',
                value: setting.scope || 'global',
                disabled: true, // Scope cannot be changed after creation
                options: [
                    {value: 'global', label: 'Global (accessible to all plugins)'},
                    {value: 'user', label: 'User (specific to current user)'},
                    {value: 'plugin', label: 'Plugin (specific to a plugin)'}
                ]
            },
            {
                key: 'ownerId',
                label: 'Owner ID',
                type: 'text',
                value: setting.ownerId,
                disabled: true
            }
        ];
    };

    // Handler for setting update using the API client directly
    const handleUpdateSetting = async (data: any) => {
        // Skip update if secure setting with no new value provided
        if ((setting?.isSecure || setting?.masked) && !data.value) {
            alert('Please enter a new value for the secure setting');
            return;
        }

        let parsedValue = data.value;

        // Try to parse the value as JSON if it starts with [ or {
        if (typeof data.value === 'string' && (data.value.trim().startsWith('[') || data.value.trim().startsWith('{'))) {
            try {
                parsedValue = JSON.parse(data.value);
            } catch (e) {
                console.error('Failed to parse value as JSON:', e);
                // Keep the original string if parsing fails
            }
        }

        const settingData = {
            key: data.key,
            value: parsedValue
        };

        return apis.updateSetting(id, settingData);
    };

    // Event bus for form field changes
    const eventBus = useMemo(() => {
        const listeners: Record<string, Function[]> = {};
        return {
            on(event: string, callback: Function) {
                if (!listeners[event]) {
                    listeners[event] = [];
                }
                listeners[event].push(callback);
                return () => this.off(event, callback);
            },
            off(event: string, callback: Function) {
                if (listeners[event]) {
                    listeners[event] = listeners[event].filter(c => c !== callback);
                }
            },
            emit(event: string, data?: any) {
                if (listeners[event]) {
                    listeners[event].forEach(cb => cb(data));
                }
            },
        };
    }, []);

    const handleFieldChange = (key: string, value: any) => {
        eventBus.emit(`${key}:change`, value);
        return null;
    };

    const context = useMemo<SettingEditorContext | undefined>(() => {
        if (!setting) return undefined;
        return {
            settingId: id,
            data: setting,
            form: {
                data: setting,
                on: eventBus.on,
                off: eventBus.off
            }
        };
    }, [id, setting, eventBus]);

    return (
        <div className="max-w-4xl mx-auto p-2 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Update Setting</h2>
                <button
                    onClick={() => location.route('/api/next-blog/dashboard/settings')}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                    Back to List
                </button>
            </div>

            {loading ? (
                <p>Loading setting data...</p>
            ) : error ? (
                <div className="p-4 bg-red-100 text-red-800 rounded">
                    Error: {error}
                </div>
            ) : !setting ? (
                <div className="p-4 bg-yellow-100 text-yellow-800 rounded">
                    Setting not found
                </div>
            ) : (
                <ExtensionZone name="setting-update-form" context={context}>
                    <div className="flex-grow bg-white p-6 rounded-lg shadow-md mb-6">
                        <ExtensionPoint name="setting-update-before" context={context}/>
                        <DynamicForm
                            id="updateSetting"
                            submitLabel="Update Setting"
                            postTo={`/api/next-blog/api/setting/${setting._id}/update`}
                            apiMethod={handleUpdateSetting}
                            redirectTo={"/api/next-blog/dashboard/settings"}
                            fields={getFormFields()}
                            onFieldChange={handleFieldChange}
                            onSubmitSuccess={(data) => {
                                console.log('Setting updated successfully:', data);
                            }}
                            onSubmitError={(error) => {
                                console.error('Error updating setting:', error);
                            }}
                        />
                        <ExtensionPoint name="setting-update-after" context={context}/>
                    </div>
                    <ExtensionPoint name="setting-update-sidebar-widget" context={context}/>
                </ExtensionZone>
            )}
        </div>
    );
};

export default UpdateSetting;