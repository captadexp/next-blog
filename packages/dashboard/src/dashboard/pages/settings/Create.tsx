import {FunctionComponent, h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {useLocation} from 'preact-iso';
import {useUser} from '../../../context/UserContext';
import DynamicForm, {DynamicFormFieldType} from '../../../components/utils/dynamic-form';
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';

interface CreateSettingProps {
    path?: string;
}

const CreateSetting: FunctionComponent<CreateSettingProps> = () => {
    const location = useLocation();
    const {apis, user, loading: userLoading} = useUser();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Skip if not authenticated
        if (!user) return;

        // No need to fetch additional data for settings
    }, [user]);

    // Define form fields
    const fields: DynamicFormFieldType[] = [
        {key: 'key', label: 'Key', type: 'text', required: true},
        {
            key: 'value',
            label: 'Value',
            type: 'textarea',
            required: true,
            placeholder: 'For arrays or objects, enter valid JSON'
        },
        {
            key: 'scope',
            label: 'Scope',
            type: 'select',
            required: false,
            value: 'global',
            options: [
                {value: 'global', label: 'Global (accessible to all plugins)'},
                {value: 'user', label: 'User (specific to current user)'}
            ]
        },
        {
            key: 'isSecure',
            label: 'Secure Setting (encrypts value, masks in dashboard)',
            type: 'select',
            required: false,
            value: "",
            options: [{value: "", label: "False"}, {value: "1", label: "True"}],
        }
    ];

    // Handler for setting creation using the API client directly
    const handleCreateSetting = async (data: any) => {
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
            value: parsedValue,
            scope: data.scope,
            isSecure: data.isSecure
        };

        return apis.createSetting(settingData);
    };

    if (userLoading) {
        return <div className="flex justify-center py-8">Loading user information...</div>;
    }

    if (!user) {
        return null; // Will redirect to login
    }

    return (
        <ExtensionZone name="setting-create" page="settings" entity="setting">
            <div className="max-w-4xl mx-auto p-2 md:p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">Create New Setting</h2>
                    <button
                        onClick={() => location.route('/api/next-blog/dashboard/settings')}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                    >
                        Back to List
                    </button>
                </div>

                <ExtensionPoint name="setting-create-form:toolbar" context={{fields}}/>

                {loading ? (
                    <p>Loading form...</p>
                ) : error ? (
                    <div className="p-4 bg-red-100 text-red-800 rounded">
                        Error: {error}
                    </div>
                ) : (
                    <ExtensionZone name="setting-create-form" page="settings" entity="setting" data={{fields}}>
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <DynamicForm
                                id="createSetting"
                                submitLabel="Create Setting"
                                postTo={"/api/next-blog/api/settings/create"}
                                apiMethod={handleCreateSetting}
                                redirectTo={"/api/next-blog/dashboard/settings"}
                                fields={fields}
                                onSubmitSuccess={(data) => {
                                    console.log('Setting created successfully:', data);
                                }}
                                onSubmitError={(error) => {
                                    console.error('Error creating setting:', error);
                                }}
                            />
                        </div>
                    </ExtensionZone>
                )}
            </div>
        </ExtensionZone>
    );
};

export default CreateSetting;