import {createContext, h} from 'preact';
import {useContext, useEffect, useState} from 'preact/hooks';
import {EntityType, Permission, PermissionType, UIConfiguration, User} from '@supergrowthai/types';
import ApiClientImpl from '../api/client';
import {useMemo} from "react";

interface UserContextType {
    user: User | null;
    config: UIConfiguration | null;
    loading: boolean;
    error: string | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    hasPermission: (permission: Permission) => boolean;
    hasAnyPermission: (permissions: Permission[]) => boolean;
    hasAllPermissions: (permissions: Permission[]) => boolean;
    apis: ApiClientImpl; // API client instance
}

const defaultApiClient = new ApiClientImpl("/api/next-blog/api/");

const UserContext = createContext<UserContextType>({
    user: null,
    config: null,
    loading: true,
    error: null,
    login: async () => false,
    logout: async () => {
    },
    refreshUser: async () => {
    },
    hasPermission: () => false,
    hasAnyPermission: () => false,
    hasAllPermissions: () => false,
    apis: defaultApiClient, // Provide the default API client
});

export const UserProvider = ({children}: { children: any }) => {
    // Initialize the API client
    const apiClient = useMemo(() => new ApiClientImpl("/api/next-blog/api"), []);

    const [user, setUser] = useState<User | null>(null);
    const [config, setConfig] = useState<UIConfiguration | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const loadConfig = async () => {
        try {
            const response = await apiClient.getConfig();
            if (response.code === 0 && response.payload) {
                setConfig(response.payload);
            } else {
                console.error('Failed to load config:', response.message);
            }
        } catch (err) {
            console.error('Error loading config:', err);
        }
    };

    const refreshUser = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await apiClient.getCurrentUser();

            if (response.code === 0 && response.payload) {
                setUser(response.payload);
            } else if (response.code === 401) {
                // Not authenticated
                setUser(null);
            } else {
                setError(response.message);
                setUser(null);
            }
        } catch (err) {
            setError('Failed to fetch user');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    // Load user and config on initial mount
    useEffect(() => {
        const initialize = async () => {
            await Promise.all([refreshUser(), loadConfig()]);
        };

        initialize();
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await apiClient.login(username, password);

            if (response.code === 0 && response.payload) {
                setUser(response.payload);
                return true;
            } else {
                setError(response.message);
                return false;
            }
        } catch (err) {
            setError('Login failed');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);

        try {
            await apiClient.logout();
            setUser(null);
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Permission helpers
    const hasPermission = (permission: Permission): boolean => {
        if (!user || !user.permissions) return false;

        // Check for all:all super admin permission
        if (user.permissions.includes('all:all')) return true;

        // Split the required permission
        const [reqEntity, reqAction] = permission.split(':') as [EntityType, PermissionType];

        // Check for entity:all permission
        if (user.permissions.includes(`${reqEntity}:all`)) return true;

        // Check for all:action permission
        if (user.permissions.includes(`all:${reqAction}`)) return true;

        // Check for exact permission
        return user.permissions.includes(permission);
    };

    const hasAnyPermission = (permissions: Permission[]): boolean => {
        return permissions.some(permission => hasPermission(permission));
    };

    const hasAllPermissions = (permissions: Permission[]): boolean => {
        return permissions.every(permission => hasPermission(permission));
    };

    return (
        <UserContext.Provider
            value={{
                user,
                config,
                loading,
                error,
                login,
                logout,
                refreshUser,
                hasPermission,
                hasAnyPermission,
                hasAllPermissions,
                apis: apiClient // Provide the API client instance
            }}
        >
            {children}
        </UserContext.Provider>
    );
};

// Custom hook to use the user context
export const useUser = () => {
    const context = useContext(UserContext);

    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }

    return context;
};