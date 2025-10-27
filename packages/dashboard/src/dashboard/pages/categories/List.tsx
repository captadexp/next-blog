import {FunctionComponent, h} from 'preact';
import {useLocation} from 'preact-iso';
import {useEffect, useState} from 'preact/hooks';
import {useUser} from "../../../context/UserContext.tsx";
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';
import {PaginatedResponse} from '@supergrowthai/next-blog-types';
import {usePagination} from '../../../hooks/usePagination';
import {PaginationControls} from '../../../components/PaginationControls';

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
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginatedResponse<Category> | null>(null);
    const {apis} = useUser();

    const {page, setPage, getParams} = usePagination();

    const fetchCategories = async () => {
        try {
            const params = getParams();
            const response = await apis.getCategories(params);

            if (response.code !== 0) {
                throw new Error(`Error fetching categories: ${response.message}`);
            }

            const data = response.payload!;
            setCategories(data.data);
            setPagination(data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching categories:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, [page]);

    const formatDate = (timestamp?: number) => {
        return timestamp ? new Date(timestamp).toLocaleDateString() : 'N/A';
    };

    const handleDelete = async (category: Category) => {
        if (!confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
            return;
        }

        setLoading(true);
        try {
            await apis.deleteCategory(category._id);
            await fetchCategories();
        } catch (err) {
            console.error('Error deleting category:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete category');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ExtensionZone name="categories-list" context={{data: categories}}>
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-semibold m-0">Categories</h2>
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
            </div>

            <ExtensionPoint name="categories-list-toolbar" context={{categories}}/>

            {loading ? (
                <p>Loading categories...</p>
            ) : error ? (
                <div className="p-4 bg-red-100 text-red-800 rounded">
                    Error: {error}
                </div>
            ) : categories.length === 0 ? (
                <p>No categories found. Create your first category!</p>
            ) : (
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
                                            <button
                                                onClick={() => handleDelete(category)}
                                                disabled={loading}
                                                className={`text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer p-0 font-inherit ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                    <ExtensionPoint name="category-item:after" context={{category}}/>
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
                dataLength={categories.length}
                onPageChange={setPage}
            />
        </ExtensionZone>
    );
};

export default CategoriesList;