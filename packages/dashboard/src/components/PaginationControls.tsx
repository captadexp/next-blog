import {h} from 'preact';
import {PaginatedResponse} from '@supergrowthai/next-blog-types';

interface PaginationControlsProps {
    pagination: PaginatedResponse<any> | null;
    currentPage: number;
    dataLength: number;
    onPageChange: (page: number) => void;
}

export const PaginationControls = ({pagination, currentPage, dataLength, onPageChange}: PaginationControlsProps) => {
    if (!pagination) return null;

    const showPrevious = currentPage > 1;
    const showNext = dataLength >= pagination.limit;

    // Don't show pagination if we're on page 1 and there's no next page
    if (!showPrevious && !showNext) {
        return null;
    }

    return (
        <div className="flex justify-center mt-4">
            <div className="flex space-x-2">
                {showPrevious && (
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                        Previous
                    </button>
                )}
                <span className="px-3 py-2">
                    Page {currentPage}
                </span>
                {showNext && (
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                        Next
                    </button>
                )}
            </div>
        </div>
    );
};