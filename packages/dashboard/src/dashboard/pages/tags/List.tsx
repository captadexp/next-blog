import {FunctionComponent, h} from 'preact';
import {useLocation} from 'preact-iso';
import {useUser} from "../../../context/UserContext.tsx";
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';
import {PaginationControls} from '../../../components/PaginationControls';
import Loader from '../../../components/Loader';
import {useEntityList} from '../../../hooks/useEntityList';
import ListPage from '../../../components/ListPageLayout';

interface TagsListProps {
    path?: string;
}

// Simple Tag interface
interface Tag {
    _id: string;
    name: string;
    slug?: string;
    createdAt?: number;
    updatedAt?: number;
}

const TagsList: FunctionComponent<TagsListProps> = () => {
    const location = useLocation();
    const {hasPermission, apis} = useUser();

    const {
        entities: tags,
        paginationLoading,
        error,
        pagination,
        deletingIds,
        handlePageChange,
        handleDelete,
        page
    } = useEntityList<Tag>({
        fetchFn: apis.getTags.bind(apis),
        deleteFn: apis.deleteTag.bind(apis),
        entityName: 'tag'
    });

    // Format date for display
    const formatDate = (timestamp?: number) => {
        return timestamp ? new Date(timestamp).toLocaleDateString() : 'N/A';
    };


    return (
        <ExtensionZone name="tags-list" context={{data: tags}}>
            <ListPage paginationLoading={paginationLoading}>
                <ListPage.Header>
                    <h2 className="text-xl font-semibold m-0">Tags</h2>
                    {hasPermission('tags:create') && (
                        <a
                            href="/api/next-blog/dashboard/tags/create"
                            onClick={(e) => {
                                e.preventDefault();
                                location.route('/api/next-blog/dashboard/tags/create');
                            }}
                            className="inline-block bg-blue-500 hover:bg-blue-600 text-white no-underline px-4 py-2 rounded"
                        >
                            Create New Tag
                        </a>
                    )}
                </ListPage.Header>

                <ExtensionPoint name="tags-list-toolbar" context={{tags}}/>

                <ListPage.Content
                    loading={paginationLoading}
                    error={error}
                    empty={tags.length === 0}
                    emptyMessage="No tags found."
                >
                    <ExtensionZone name="tags-table" context={{data: tags}}>
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
                                {tags.map(tag => (
                                    <>
                                        <ExtensionPoint name="tag-item:before" context={{tag}}/>
                                        <tr key={tag._id} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="p-3">{tag.name}</td>
                                            <td className="p-3">{tag.slug || 'N/A'}</td>
                                            <td className="p-3">{formatDate(tag.createdAt)}</td>
                                            <td className="p-3">
                                                {hasPermission('tags:update') && (
                                                    <a
                                                        href={`/api/next-blog/dashboard/tags/${tag._id}`}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            location.route(`/api/next-blog/dashboard/tags/${tag._id}`);
                                                        }}
                                                        className="text-blue-500 hover:text-blue-700 no-underline mr-3"
                                                    >
                                                        Edit
                                                    </a>
                                                )}
                                                {hasPermission('tags:delete') && (
                                                    <button
                                                        onClick={() => handleDelete(tag, `Are you sure you want to delete the tag "${tag.name}"?`)}
                                                        disabled={deletingIds.has(tag._id)}
                                                        className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer p-0 font-inherit disabled:opacity-50"
                                                    >
                                                        {deletingIds.has(tag._id) ?
                                                            <Loader size="sm" text=""/> : 'Delete'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                        <ExtensionPoint name="tag-item:after" context={{tag}}/>
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
                    dataLength={tags.length}
                    onPageChange={handlePageChange}
                    loading={paginationLoading}
                />
            </ListPage>
        </ExtensionZone>
    );
};

export default TagsList;