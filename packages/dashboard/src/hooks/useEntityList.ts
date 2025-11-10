import {useEffect, useState} from 'preact/hooks';
import {useLocation} from 'preact-iso';
import {PaginatedResponse} from '@supergrowthai/next-blog-types';
import {useUser} from '../context/UserContext';
import {usePagination} from './usePagination';

interface EntityListConfig<T> {
    fetchFn: (params: any) => Promise<{code: number; payload?: PaginatedResponse<T>; message?: string}>;
    deleteFn?: (id: string) => Promise<{code: number; message?: string}>;
    entityName: string;
    dependencies?: any[];
    additionalActions?: Record<string, {
        fn: (id: string) => Promise<{code: number; message?: string}>;
        confirmMessage?: string;
    }>;
}

export function useEntityList<T extends {_id: string}>({
    fetchFn,
    deleteFn,
    entityName,
    dependencies = [],
    additionalActions = {}
}: EntityListConfig<T>) {
    const location = useLocation();
    const {user} = useUser();
    const [entities, setEntities] = useState<T[]>([]);
    const [paginationLoading, setPaginationLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginatedResponse<T> | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [actioningIds, setActioningIds] = useState<Record<string, Set<string>>>(
        Object.keys(additionalActions).reduce((acc, key) => ({...acc, [key]: new Set()}), {})
    );

    const {page, setPage, getParams} = usePagination();

    const handlePageChange = async (newPage: number) => {
        setPaginationLoading(true);
        setPage(newPage);
    };

    const fetchEntities = async () => {
        try {
            const params = getParams();
            const response = await fetchFn(params);

            if (response.code === 0 && response.payload) {
                setEntities(response.payload.data);
                setPagination(response.payload);
            } else {
                throw new Error(response.message || `Failed to fetch ${entityName}`);
            }
            setPaginationLoading(false);
        } catch (err) {
            console.error(`Error fetching ${entityName}:`, err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setPaginationLoading(false);
        }
    };

    const handleDelete = async (entity: T, confirmMessage?: string) => {
        if (!deleteFn) return;

        const message = confirmMessage || `Are you sure you want to delete this ${entityName}?`;
        if (!confirm(message)) {
            return;
        }

        setDeletingIds(prev => new Set(prev.add(entity._id)));
        try {
            const response = await deleteFn(entity._id);

            if (response.code === 0) {
                setEntities(entities.filter(e => e._id !== entity._id));
            } else {
                alert(`Error: ${response.message}`);
            }
        } catch (err) {
            console.error(`Error deleting ${entityName}:`, err);
            alert(`Failed to delete ${entityName}. Please try again.`);
        } finally {
            setDeletingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(entity._id);
                return newSet;
            });
        }
    };

    const createActionHandler = (actionName: string) => async (entityId: string, customConfirmMessage?: string) => {
        const action = additionalActions[actionName];
        if (!action) return;

        const message = customConfirmMessage || action.confirmMessage || `Are you sure you want to ${actionName} this ${entityName}?`;
        if (!confirm(message)) {
            return;
        }

        setActioningIds(prev => ({
            ...prev,
            [actionName]: new Set(prev[actionName].add(entityId))
        }));

        try {
            const response = await action.fn(entityId);
            if (response.code === 0) {
                await fetchEntities();
            } else {
                alert(`Error: ${response.message}`);
            }
        } catch (err) {
            console.error(`Error ${actionName}ing ${entityName}:`, err);
            alert(`Failed to ${actionName} ${entityName}. Please try again.`);
        } finally {
            setActioningIds(prev => ({
                ...prev,
                [actionName]: new Set([...prev[actionName]].filter(id => id !== entityId))
            }));
        }
    };

    const actionHandlers = Object.keys(additionalActions).reduce((acc, actionName) => ({
        ...acc,
        [actionName]: createActionHandler(actionName)
    }), {} as Record<string, (entityId: string, customConfirmMessage?: string) => Promise<void>>);

    useEffect(() => {
        if (!user && !paginationLoading) {
            location.route('/api/next-blog/dashboard/login');
            return;
        }

        fetchEntities();
    }, [user, paginationLoading, page, ...dependencies]);

    return {
        entities,
        setEntities,
        paginationLoading,
        error,
        pagination,
        deletingIds,
        actioningIds,
        handlePageChange,
        handleDelete,
        fetchEntities,
        actionHandlers,
        page
    };
}