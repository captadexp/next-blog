import {FunctionComponent, h} from 'preact';
import {useLocation} from 'preact-iso';
import {useUser} from '../../context/UserContext';
import {Permission} from '../../types/api';
import packageJson from '../../../package.json';

interface LayoutProps {
    children: any;
    currentPath: string;
}

export const Layout: FunctionComponent<LayoutProps> = ({children, currentPath}) => {
    const location = useLocation();
    const {user, config, loading, logout, hasPermission} = useUser();

    interface NavItem {
        path: string;
        label: string;
        icon?: string;
        requiredPermission?: Permission;
    }

    // Default navigation items with required permissions
    const defaultNavItems: NavItem[] = [
        {path: '/api/next-blog/dashboard', label: 'Dashboard', icon: 'home'},
        {path: '/api/next-blog/dashboard/blogs', label: 'Blogs', icon: 'file-text', requiredPermission: 'blogs:list'},
        {path: '/api/next-blog/dashboard/tags', label: 'Tags', icon: 'tag', requiredPermission: 'tags:list'},
        {
            path: '/api/next-blog/dashboard/categories',
            label: 'Categories',
            icon: 'folder',
            requiredPermission: 'categories:list'
        },
        {path: '/api/next-blog/dashboard/users', label: 'Users', icon: 'users', requiredPermission: 'users:list'},
        {path: '/api/next-blog/dashboard/settings', label: 'Settings', icon: 'settings', requiredPermission: 'settings:list'},
        {path: '/api/next-blog/dashboard/plugins', label: 'Plugins', icon: 'package', requiredPermission: 'plugins:list'},
    ];

    // Filter navigation items based on user permissions
    const navItems = config?.navigation?.menuItems ||
        defaultNavItems.filter(item =>
            !item.requiredPermission || hasPermission(item.requiredPermission)
        );

    // Get branding from config or use defaults
    const brandName = config?.branding?.name || '...';
    const brandDescription = config?.branding?.description || '... Dashboard';

    console.log("brandName", brandName)

    // Get theme colors from config or use defaults
    const primaryColor = config?.theme?.primaryColor || '#3498db';
    const isDarkMode = config?.theme?.darkMode || false;

    const themeClass = isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';
    const headerClass = isDarkMode ? 'border-gray-700' : 'border-gray-200';
    const footerClass = isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500';

    const handleLogout = async (e: Event) => {
        e.preventDefault();
        await logout();
        location.route('/api/next-blog/dashboard');
    };

    return (
        <div className={`w-full min-h-screen max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 ${themeClass}`}>
            <header className={`mb-6 border-b pb-4 ${headerClass}`}>
                <div className="flex flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h1 className="text-xl sm:text-2xl font-bold">{brandName}</h1>
                    {user && (
                        <div className="flex items-center gap-3 self-end sm:self-auto">
                            <span className="text-sm hidden sm:inline">
                                {user.name}
                                {user.permissions.includes('all:all') && <span className="ml-1">(Admin)</span>}
                            </span>
                        </div>
                    )}
                </div>
                <nav className="overflow-x-auto pb-2">
                    <ul className="flex flex-nowrap sm:flex-wrap gap-4 sm:gap-6 list-none p-0 m-0 min-w-max">
                        {navItems.map(item => (
                            <li key={item.path}>
                                <a
                                    href={item.path}
                                    onClick={e => {
                                        e.preventDefault();
                                        location.route(item.path);
                                    }}
                                    className={`no-underline whitespace-nowrap py-1 px-1 ${
                                        currentPath === item.path
                                            ? `font-bold`
                                            : `hover:opacity-80`
                                    }`}
                                    style={{
                                        color: currentPath === item.path ? primaryColor : undefined
                                    }}
                                >
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </header>

            <main className="min-h-[calc(100vh-220px)]">
                {loading ? (
                    <div className="flex justify-center items-center h-32">
                        <p>Loading...</p>
                    </div>
                ) : (
                    children
                )}
            </main>

            <footer className={`mt-8 pt-4 border-t text-sm ${footerClass}`}>
                <div className="flex flex-row justify-between items-start sm:items-center gap-2">
                    <p>{brandDescription}</p>
                    <p className="text-xs opacity-75">v{packageJson.version}</p>
                </div>
            </footer>
        </div>
    );
};
