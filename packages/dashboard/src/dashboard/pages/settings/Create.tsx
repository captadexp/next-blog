import {FunctionComponent, h} from 'preact';
import {useEffect} from 'preact/hooks';
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

        const result = await apis.createSetting(settingData);

        // Navigate to list page after successful creation
        location.route('/api/next-blog/dashboard/settings');

        return result;
    };

    if (userLoading) {
        return <div className="flex justify-center py-8">Loading user information...</div>;
    }

    if (!user) {
        return null; // Will redirect to login
    }

    return (
        <ExtensionZone name="setting-create" context={{data: {fields}}}>
            <div className="max-w-4xl mx-auto p-2 md:p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">Create New Setting</h2>
                    <button
                        onClick={() => window.history.back()}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                    >
                        Back to List
                    </button>
                </div>

                <ExtensionPoint name="setting-create-form:toolbar" context={{fields}}/>
                <ExtensionZone name="setting-create-form" context={{data: {fields}}}>
                    <div className="flex-grow bg-white p-6 rounded-lg shadow-md mb-6">
                        <DynamicForm
                            id="createSetting"
                            submitLabel="Create Setting"
                            apiMethod={handleCreateSetting}
                            fields={fields}
                        />
                    </div>
                </ExtensionZone>
            </div>
        </ExtensionZone>
    );
};

export default CreateSetting;