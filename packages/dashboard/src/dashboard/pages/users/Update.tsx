import {FunctionComponent, h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {Permission, User} from '@supergrowthai/next-blog-types';
import {useLocation} from 'preact-iso/router';
import DynamicForm, {DynamicFormFieldType} from '../../../components/utils/dynamic-form';
import {useUser} from '../../../context/UserContext';
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';

interface UpdateUserProps {
    path?: string;
    id?: string;
}

const UpdateUser: FunctionComponent<UpdateUserProps> = ({id: propId}) => {
    const location = useLocation();
    const {apis} = useUser(); // Get API client from context
    const [userId, setUserId] = useState<string>('');
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [availablePermissions] = useState<Permission[]>([
        'blogs:list', 'blogs:read', 'blogs:create', 'blogs:update', 'blogs:delete',
        'categories:list', 'categories:read', 'categories:create', 'categories:update', 'categories:delete',
        'tags:list', 'tags:read', 'tags:create', 'tags:update', 'tags:delete',
        'users:list', 'users:read', 'users:create', 'users:update', 'users:delete',
        'media:list', 'media:read', 'media:create', 'media:update', 'media:delete',
        'blogs:all', 'categories:all', 'tags:all', 'users:all', 'media:all',
        'all:list', 'all:read', 'all:create', 'all:update', 'all:delete', 'all:all'
    ]);

    // Parse user ID from query string or props
    useEffect(() => {
        if (propId) {
            setUserId(propId);
        } else {
            const params = new URLSearchParams(location.query);
            const queryId = params.get('id');
            if (queryId) {
                setUserId(queryId);
            } else {
                setError('No user ID provided');
                setLoading(false);
            }
        }
    }, [location, propId]);

    // Fetch user data
    useEffect(() => {
        if (!userId) return;

        const fetchUser = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await apis.getUser(userId);

                if (response.code === 0 && response.payload) {
                    const userData = response.payload;
                    setUser(userData);
                } else {
                    setError(response.message || 'Failed to fetch user data');
                }
            } catch (err) {
                setError('An error occurred while fetching user data');
                console.error('Error fetching user:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [userId]);

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

    // Define form fields based on user data
    const getFormFields = (): DynamicFormFieldType[] => {
        if (!user) return [];

        // Group permissions for UI display
        const groupedPermissions = groupPermissions(availablePermissions);

        const fields: DynamicFormFieldType[] = [
            {key: 'username', label: 'Username', type: 'text', value: user.username, required: true},
            {key: 'email', label: 'Email', type: 'text', value: user.email, required: true},
            {key: 'name', label: 'Name', type: 'text', value: user.name, required: true},
            {
                key: 'slug',
                label: 'Slug',
                type: 'text',
                value: user.slug,
                required: true,
                placeholder: 'URL-friendly identifier'
            },
            {key: 'password', label: 'Password (leave blank to keep current)', type: 'password', value: ''},
            {key: 'bio', label: 'Bio', type: 'textarea', value: user.bio || ''},
            {
                key: 'permissions',
                label: 'User Permissions',
                type: 'checkboxgroup',
                value: user.permissions || [],
                groupedOptions: groupedPermissions,
                showLabels: true
            }
        ];

        return fields;
    };

    // Handle the form submission through the API client
    const handleUpdateUser = async (formData: any) => {
        if (!userId) return;

        try {
            // Transform formData to include permissions if needed
            const response = await apis.updateUser(userId, formData);

            if (response.code !== 0) {
                throw new Error(response.message || 'Failed to update user');
            }

            return response;
        } catch (err) {
            console.error('Error updating user:', err);
            throw err;
        }
    };

    // The permissions are now handled within the DynamicForm via the PermissionsField component

    return (
        <ExtensionZone name="user-update" context={{zone: 'user-update', page: 'users', entity: 'user', data: {user, loading, error, availablePermissions}}}>
            <div className="max-w-4xl mx-auto p-2 md:p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">Update User</h2>
                    <button
                        onClick={() => location.route('/api/next-blog/dashboard/users')}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                    >
                        Back to List
                    </button>
                </div>

                {loading ? (
                    <p>Loading user data...</p>
                ) : error ? (
                    <div className="p-4 bg-red-100 text-red-800 rounded">
                        Error: {error}
                    </div>
                ) : !user ? (
                    <div className="p-4 bg-yellow-100 text-yellow-800 rounded">
                        User not found
                    </div>
                ) : (
                    <>
                        <ExtensionPoint name="user-update-form:toolbar" context={{user, fields: getFormFields(), availablePermissions}}/>
                        
                        <ExtensionZone name="user-update-form" context={{zone: 'user-update-form', page: 'users', entity: 'user', data: {user, fields: getFormFields(), availablePermissions}}}>
                            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                                <DynamicForm
                                    id="updateUser"
                                    submitLabel="Update User"
                                    postTo={`/api/next-blog/api/user/${userId}/update`}
                                    redirectTo={"api/next-blog/dashboard/users"}
                                    fields={getFormFields()}
                                    apiMethod={handleUpdateUser}
                                />
                            </div>
                        </ExtensionZone>
                    </>
                )}
            </div>
        </ExtensionZone>
    );
};

export default UpdateUser;