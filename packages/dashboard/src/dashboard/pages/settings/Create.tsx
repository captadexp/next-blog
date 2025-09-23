import {FunctionComponent, h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {useLocation} from 'preact-iso';
import {useUser} from '../../../context/UserContext';
import DynamicForm, {DynamicFormFieldType} from '../../../components/utils/dynamic-form';

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
            key: 'owner',
            label: 'Owner',
            type: 'text',
            required: true,
            placeholder: 'Enter "system" for system settings or the name of the plugin/package'
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
            owner: data.owner
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

            {loading ? (
                <p>Loading form...</p>
            ) : error ? (
                <div className="p-4 bg-red-100 text-red-800 rounded">
                    Error: {error}
                </div>
            ) : (
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
            )}
        </div>
    );
};

export default CreateSetting;