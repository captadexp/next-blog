import {h, FunctionComponent} from 'preact';
import {useLocation} from 'preact-iso';

interface LayoutProps {
    children: any;
    currentPath: string;
}

export const Layout: FunctionComponent<LayoutProps> = ({children, currentPath}) => {
    const location = useLocation();
    
    // Simple navigation items for the dashboard
    const navItems = [
        {path: '/api/next-blog/dashboard', label: 'Dashboard'},
        {path: '/api/next-blog/dashboard/blogs', label: 'Blogs'},
        {path: '/api/next-blog/dashboard/tags', label: 'Tags'},
        {path: '/api/next-blog/dashboard/categories', label: 'Categories'},
        {path: '/api/next-blog/dashboard/authors', label: 'Authors'},
    ];

    return (
        <div className="max-w-6xl mx-auto p-5 bg-white rounded-lg shadow-md">
            <header className="mb-6 border-b border-gray-200 pb-4">
                <h1 className="text-2xl font-bold mb-4">Next-Blog Dashboard</h1>
                <nav>
                    <ul className="flex flex-wrap gap-6 list-none p-0 m-0">
                        {navItems.map(item => (
                            <li key={item.path}>
                                <a 
                                    href={item.path}
                                    onClick={e => {
                                      e.preventDefault();
                                      location.route(item.path);
                                    }}
                                    className={`no-underline ${
                                        currentPath === item.path
                                            ? 'text-blue-700 font-bold'
                                            : 'text-blue-500 hover:text-blue-700'
                                    }`}
                                >
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </header>

            <main className="min-h-[60vh]">
                {children}
            </main>

            <footer className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
                <p>Next-Blog Admin Dashboard</p>
            </footer>
        </div>
    );
};