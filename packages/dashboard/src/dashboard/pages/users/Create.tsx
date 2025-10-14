import {FunctionComponent, h} from 'preact';
import {useState} from 'preact/hooks';
import {Permission} from '@supergrowthai/next-blog-types';
import {useLocation} from 'preact-iso/router';
import DynamicForm, {DynamicFormFieldType} from '../../../components/utils/dynamic-form';
import {useUser} from '../../../context/UserContext';
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';

interface CreateUserProps {
    path?: string;
}

const CreateUser: FunctionComponent<CreateUserProps> = () => {
    const location = useLocation();
    const {apis} = useUser(); // Get API client from context
    const [availablePermissions] = useState<Permission[]>([
        'blogs:list', 'blogs:read', 'blogs:create', 'blogs:update', 'blogs:delete',
        'categories:list', 'categories:read', 'categories:create', 'categories:update', 'categories:delete',
        'tags:list', 'tags:read', 'tags:create', 'tags:update', 'tags:delete',
        'users:list', 'users:read', 'users:create', 'users:update', 'users:delete',
        'media:list', 'media:read', 'media:create', 'media:update', 'media:delete',
        'blogs:all', 'categories:all', 'tags:all', 'users:all', 'media:all',
        'all:list', 'all:read', 'all:create', 'all:update', 'all:delete', 'all:all'
    ]);

    // Group permissions by entity type for better UI organization
    const groupPermissions = (permissions: Permission[]): Record<string, Permission[]> => {
        const grouped: Record<string, Permission[]> = {};
        permissions.forEach(permission => {
            const [entity] = permission.split(':') as [string, string];
            if (!grouped[entity]) {
                grouped[entity] = [];
            }
            grouped[entity].push(permission);
        });
        return grouped;
    };

    // Define form fields
    const getFormFields = (): DynamicFormFieldType[] => {
        // Group permissions for UI display
        const groupedPermissions = groupPermissions(availablePermissions);

        return [
            {key: 'username', label: 'Username', type: 'text', required: true},
            {key: 'email', label: 'Email', type: 'text', required: true},
            {key: 'name', label: 'Name', type: 'text', required: true},
            {
                key: 'slug',
                label: 'Slug',
                type: 'text',
                required: true,
                placeholder: 'URL-friendly identifier. Auto-generated from name if left empty.'
            },
            {key: 'password', label: 'Password', type: 'password', required: true},
            {key: 'bio', label: 'Bio', type: 'textarea'},
            {
                key: 'permissions',
                label: 'User Permissions',
                type: 'checkboxgroup',
                value: ['blogs:read', 'blogs:list'], // Default permissions
                groupedOptions: groupedPermissions,
                showLabels: true
            }
        ];
    };

    // Auto-generate slug from name if slug is empty
    const handleFieldChange = (key: string, value: any, formData: any) => {
        // This function will be called by DynamicForm after field changes
        // We can use it to implement auto-slug generation

        if (key === 'name' && value && !formData.slug) {
            const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            // Return an object of additional field updates to apply
            return {slug};
        }
        return null;
    };

    // Handle the form submission through the API client
    const handleCreateUser = async (formData: any) => {
        try {
            const response = await apis.createUser(formData);

            if (response.code !== 0) {
                throw new Error(response.message || 'Failed to create user');
            }

            return response;
        } catch (err) {
            console.error('Error creating user:', err);
            throw err;
        }
    };

    return (
        <ExtensionZone name="user-create" context={{zone: 'user-create', page: 'users', entity: 'user'}}>
            <div className="max-w-4xl mx-auto p-2 md:p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">Create New User</h2>
                    <button
                        onClick={() => location.route('/api/next-blog/dashboard/users')}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                    >
                        Back to List
                    </button>
                </div>

                <ExtensionPoint name="user-create-form:toolbar" context={{fields: getFormFields(), availablePermissions}}/>

                <ExtensionZone name="user-create-form" context={{zone: 'user-create-form', page: 'users', entity: 'user', data: {fields: getFormFields(), availablePermissions}}}>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <DynamicForm
                            id="createUser"
                            submitLabel="Create User"
                            postTo={"/api/next-blog/api/users/create"}
                            redirectTo={"/api/next-blog/dashboard/users"}
                            fields={getFormFields()}
                            apiMethod={handleCreateUser}
                            onFieldChange={handleFieldChange}
                        />
                    </div>
                </ExtensionZone>
            </div>
        </ExtensionZone>
    );
};

export default CreateUser;