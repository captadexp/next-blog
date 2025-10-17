import {useEffect, useState} from 'preact/hooks';
import {useLocation} from 'preact-iso';

export interface PaginationState {
    page: number;
    limit: number;
}

export interface UsePaginationResult {
    page: number;
    limit: number;
    setPage: (page: number) => void;
    updateURL: (page: number) => void;
    getParams: () => { page: number; limit: number };
}

export function usePagination(defaultLimit: number = 10): UsePaginationResult {
    const location = useLocation();

    // Get initial page from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const initialPage = parseInt(urlParams.get('page') || '1');

    const [page, setPageState] = useState(initialPage);
    const limit = defaultLimit;

    // Update URL when page changes
    const updateURL = (newPage: number) => {
        const params = new URLSearchParams(window.location.search);

        if (newPage > 1) {
            params.set('page', newPage.toString());
        } else {
            params.delete('page');
        }

        const newURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState({}, '', newURL);
    };

    const setPage = (newPage: number) => {
        setPageState(newPage);
        updateURL(newPage);
    };

    const getParams = () => ({page, limit});

    // Sync with URL changes (e.g., browser back/forward)
    useEffect(() => {
        const handlePopState = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const urlPage = parseInt(urlParams.get('page') || '1');
            setPageState(urlPage);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    return {
        page,
        limit,
        setPage,
        updateURL,
        getParams
    };
}