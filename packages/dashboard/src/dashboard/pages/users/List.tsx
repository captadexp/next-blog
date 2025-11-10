import {h} from 'preact';
import {useLocation} from 'preact-iso';
import {Permission, User} from '@supergrowthai/next-blog-types';
import {useUser} from '../../../context/UserContext';
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';
import {PaginationControls} from '../../../components/PaginationControls';
import Loader from '../../../components/Loader';
import {useEntityList} from '../../../hooks/useEntityList';
import ListPage from '../../../components/ListPageLayout';

const UserList = () => {
    const location = useLocation();
    const {hasPermission, apis} = useUser();

    const {
        entities: users,
        paginationLoading,
        error,
        pagination,
        deletingIds,
        handlePageChange,
        handleDelete,
        page
    } = useEntityList<User>({
        fetchFn: apis.getUsers.bind(apis),
        deleteFn: apis.deleteUser.bind(apis),
        entityName: 'user'
    });


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

    return (
        <ExtensionZone name="users-list" context={{data: users}}>
            <div className="p-4">
                <ListPage paginationLoading={paginationLoading}>
                    <ListPage.Header>
                        <h1 className="text-2xl font-bold">Users</h1>
                        {hasPermission('users:create') && (
                            <a
                                href="/api/next-blog/dashboard/users/create"
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Add New User
                            </a>
                        )}
                    </ListPage.Header>

                    <ExtensionPoint name="users-list-toolbar" context={{users}}/>

                    <ListPage.Content
                        loading={paginationLoading}
                        error={error}
                        empty={users.length === 0}
                        emptyMessage="No users found."
                    >
                        <ExtensionZone name="users-table" context={{data: users}}>
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
                                                                onClick={() => handleDelete(user, 'Are you sure you want to delete this user?')}
                                                                disabled={deletingIds.has(user._id)}
                                                                className="text-red-500 hover:text-red-700 disabled:opacity-50"
                                                            >
                                                                {deletingIds.has(user._id) ?
                                                                    <Loader size="sm" text=""/> : 'Delete'}
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
                    </ListPage.Content>

                    <PaginationControls
                        pagination={pagination}
                        currentPage={page}
                        dataLength={users.length}
                        onPageChange={handlePageChange}
                        loading={paginationLoading}
                    />
                </ListPage>
            </div>
        </ExtensionZone>
    );
};

export default UserList;