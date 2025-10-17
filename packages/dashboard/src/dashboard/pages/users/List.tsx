import {h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {PaginatedResponse, Permission, User} from '@supergrowthai/next-blog-types';
import {useUser} from '../../../context/UserContext';
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';
import {usePagination} from '../../../hooks/usePagination';
import {PaginationControls} from '../../../components/PaginationControls';

const UserList = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginatedResponse<User> | null>(null);
    const {hasPermission, apis} = useUser();

    const {page, setPage, getParams} = usePagination();

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = getParams();
            const response = await apis.getUsers(params);

            if (response.code === 0 && response.payload) {
                setUsers(response.payload.data);
                setPagination(response.payload);
            } else {
                setError(response.message || 'Failed to fetch users');
            }
        } catch (err) {
            setError('An error occurred while fetching users');
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [page]);

    const handleDeleteUser = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this user?')) {
            return;
        }

        try {
            const response = await apis.deleteUser(id);

            if (response.code === 0) {
                // Remove user from state
                setUsers(users.filter(user => user._id !== id));
            } else {
                alert(`Failed to delete user: ${response.message}`);
            }
        } catch (err) {
            console.error('Error deleting user:', err);
            alert('An error occurred while deleting the user');
        }
    };

    // Helper function to display a user's permissions in a readable format
    const formatPermissions = (permissions: Permission[]): string => {
        if (!permissions || permissions.length === 0) return 'None';

        // Check for admin permission
        if (permissions.includes('all:all')) return 'Administrator';

        // Show first 3 permissions with a count if there are more
        const displayedPermissions = permissions.slice(0, 3).join(', ');
        return permissions.length > 3 ?
            `${displayedPermissions} and ${permissions.length - 3} more` :
            displayedPermissions;
    };

    if (loading) {
        return <div className="p-4">Loading users...</div>;
    }

    if (error) {
        return <div className="p-4 text-red-500">Error: {error}</div>;
    }

    return (
        <ExtensionZone name="users-list" context={{zone: 'users-list', page: 'users', data: users}}>
            <div className="p-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Users</h1>
                    {hasPermission('users:create') && (
                        <a
                            href="/api/next-blog/dashboard/users/create"
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Add New User
                        </a>
                    )}
                </div>

                <ExtensionPoint name="users-list-toolbar" context={{users}}/>


                {users.length === 0 ? (
                    <div className="text-gray-500">No users found.</div>
                ) : (
                    <ExtensionZone name="user-table" context={{zone: 'user-table', page: 'users', data: users}}>
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200">
                                <thead>
                                <tr className="bg-gray-100">
                                    <th className="py-2 px-4 border-b text-left">Name</th>
                                    <th className="py-2 px-4 border-b text-left">Username</th>
                                    <th className="py-2 px-4 border-b text-left">Email</th>
                                    <th className="py-2 px-4 border-b text-left">Permissions</th>
                                    <th className="py-2 px-4 border-b text-left">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {users.map(user => (
                                    <>
                                        <ExtensionPoint name="user-item:before" context={{user}}/>
                                        <tr key={user._id} className="hover:bg-gray-50">
                                            <td className="py-2 px-4 border-b">{user.name}</td>
                                            <td className="py-2 px-4 border-b">{user.username}</td>
                                            <td className="py-2 px-4 border-b">{user.email}</td>
                                            <td className="py-2 px-4 border-b">{formatPermissions(user.permissions)}</td>
                                            <td className="py-2 px-4 border-b">
                                                <div className="flex space-x-2">
                                                    {hasPermission('users:update') && !user.isSystem && (
                                                        <a
                                                            href={`/api/next-blog/dashboard/users/${user._id}`}
                                                            className="text-blue-500 hover:text-blue-700"
                                                        >
                                                            Edit
                                                        </a>
                                                    )}
                                                    {hasPermission('users:delete') && !user.isSystem && (
                                                        <button
                                                            onClick={() => handleDeleteUser(user._id)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        <ExtensionPoint name="user-item:after" context={{user}}/>
                                    </>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </ExtensionZone>
                )}

                <PaginationControls
                    pagination={pagination}
                    currentPage={page}
                    dataLength={users.length}
                    onPageChange={setPage}
                />
            </div>
        </ExtensionZone>
    );
};

export default UserList;