import {h} from 'preact';
import {PaginatedResponse} from '@supergrowthai/next-blog-types';

interface PaginationControlsProps {
    pagination: PaginatedResponse<any> | null;
    currentPage: number;
    dataLength: number;
    onPageChange: (page: number) => void;
    loading?: boolean;
}

export const PaginationControls = ({pagination, currentPage, dataLength, onPageChange, loading}: PaginationControlsProps) => {
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
                        disabled={loading}
                        className={`px-3 py-2 rounded ${loading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
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
                        disabled={loading}
                        className={`px-3 py-2 rounded ${loading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        Next
                    </button>
                )}
            </div>
        </div>
    );
};