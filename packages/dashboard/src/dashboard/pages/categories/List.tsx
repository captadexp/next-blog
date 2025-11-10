import {FunctionComponent, h} from 'preact';
import {useLocation} from 'preact-iso';
import {useUser} from "../../../context/UserContext.tsx";
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';
import {PaginationControls} from '../../../components/PaginationControls';
import Loader from '../../../components/Loader';
import {useEntityList} from '../../../hooks/useEntityList';
import ListPage from '../../../components/ListPageLayout';

interface CategoriesListProps {
    path?: string;
}

// Simple Category interface
interface Category {
    _id: string;
    name: string;
    slug?: string;
    createdAt?: number;
    updatedAt?: number;
}

const CategoriesList: FunctionComponent<CategoriesListProps> = () => {
    const location = useLocation();
    const {hasPermission, apis} = useUser();

    const {
        entities: categories,
        paginationLoading,
        error,
        pagination,
        deletingIds,
        handlePageChange,
        handleDelete,
        page
    } = useEntityList<Category>({
        fetchFn: apis.getCategories.bind(apis),
        deleteFn: apis.deleteCategory.bind(apis),
        entityName: 'category'
    });

    const formatDate = (timestamp?: number) => {
        return timestamp ? new Date(timestamp).toLocaleDateString() : 'N/A';
    };


    return (
        <ExtensionZone name="categories-list" context={{data: categories}}>
            <ListPage paginationLoading={paginationLoading}>
                <ListPage.Header>
                    <h2 className="text-xl font-semibold m-0">Categories</h2>
                    {hasPermission('categories:create') && (
                        <a
                            href="/api/next-blog/dashboard/categories/create"
                            onClick={(e) => {
                                e.preventDefault();
                                location.route('/api/next-blog/dashboard/categories/create');
                            }}
                            className="inline-block bg-blue-500 hover:bg-blue-600 text-white no-underline px-4 py-2 rounded"
                        >
                            Create New Category
                        </a>
                    )}
                </ListPage.Header>

                <ExtensionPoint name="categories-list-toolbar" context={{categories}}/>

                <ListPage.Content
                    loading={paginationLoading}
                    error={error}
                    empty={categories.length === 0}
                    emptyMessage="No categories found."
                >
                    <ExtensionZone name="categories-table" context={{data: categories}}>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                <tr className="bg-gray-100">
                                    <th className="p-3 text-left border-b border-gray-200">Name</th>
                                    <th className="p-3 text-left border-b border-gray-200">Slug</th>
                                    <th className="p-3 text-left border-b border-gray-200">Created</th>
                                    <th className="p-3 text-left border-b border-gray-200">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {categories.map(category => (
                                    <>
                                        <ExtensionPoint name="category-item:before" context={{category}}/>
                                        <tr key={category._id} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="p-3">{category.name}</td>
                                            <td className="p-3">{category.slug || 'N/A'}</td>
                                            <td className="p-3">{formatDate(category.createdAt)}</td>
                                            <td className="p-3">
                                                {hasPermission('categories:update') && (
                                                    <a
                                                        href={`/api/next-blog/dashboard/categories/${category._id}`}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            location.route(`/api/next-blog/dashboard/categories/${category._id}`);
                                                        }}
                                                        className="text-blue-500 hover:text-blue-700 no-underline mr-3"
                                                    >
                                                        Edit
                                                    </a>
                                                )}
                                                {hasPermission('categories:delete') && (
                                                    <button
                                                        onClick={() => handleDelete(category, `Are you sure you want to delete the category "${category.name}"?`)}
                                                        disabled={deletingIds.has(category._id)}
                                                        className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer p-0 font-inherit disabled:opacity-50"
                                                    >
                                                        {deletingIds.has(category._id) ?
                                                            <Loader size="sm" text=""/> : 'Delete'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                        <ExtensionPoint name="category-item:after" context={{category}}/>
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
                    dataLength={categories.length}
                    onPageChange={handlePageChange}
                    loading={paginationLoading}
                />
            </ListPage>
        </ExtensionZone>
    );
};

export default CategoriesList;