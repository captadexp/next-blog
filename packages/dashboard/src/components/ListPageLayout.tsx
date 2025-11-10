import {FunctionComponent, h, ComponentChildren} from 'preact';
import Loader from './Loader';

interface ListPageProps {
    children: ComponentChildren;
    paginationLoading?: boolean;
}

interface ListPageHeaderProps {
    children: ComponentChildren;
}

interface ListPageContentProps {
    children: ComponentChildren;
    loading?: boolean;
    error?: string | null;
    empty?: boolean;
    emptyMessage?: string;
}

const ListPage: FunctionComponent<ListPageProps> & {
    Header: FunctionComponent<ListPageHeaderProps>;
    Content: FunctionComponent<ListPageContentProps>;
} = ({ children, paginationLoading }) => {
    return (
        <div className="relative">
            {children}
            {paginationLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex justify-center items-center z-10">
                    <Loader text="Loading..."/>
                </div>
            )}
        </div>
    );
};

ListPage.Header = ({ children }) => (
    <div className="flex justify-between items-center mb-5">
        {children}
    </div>
);

ListPage.Content = ({ loading, error, empty, emptyMessage, children }) => {
    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader/>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-100 text-red-800 rounded">
                Error: {error}
            </div>
        );
    }

    if (empty) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 mb-4">{emptyMessage || 'No items found.'}</p>
            </div>
        );
    }

    return <div>{children}</div>;
};

export default ListPage;