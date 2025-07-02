import {h, render} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {LocationProvider, Route, Router} from 'preact-iso';
import {UserProvider} from '../context/UserContext';

import '../styles/styles.css';

// Import pages
import {Layout} from './components/Layout';
import Home from './pages/Home';

// Import blogs pages
import BlogsList from './pages/blogs/List';
import CreateBlog from './pages/blogs/Create';
import UpdateBlog from './pages/blogs/Update';

// Import users pages (replacing authors)
import UsersList from './pages/users/List';
import CreateUser from './pages/users/Create';
import UpdateUser from './pages/users/Update';

// Import categories pages
import CategoriesList from './pages/categories/List';
import CreateCategory from './pages/categories/Create';
import UpdateCategory from './pages/categories/Update';

// Import tags pages
import TagsList from './pages/tags/List';
import CreateTag from './pages/tags/Create';
import UpdateTag from './pages/tags/Update';
import Settings from './pages/settings';

// Import settings pages
import SettingsList from './pages/settings/List';
import CreateSetting from './pages/settings/Create';
import UpdateSetting from './pages/settings/Update';

// Main Dashboard App
function DashboardApp() {
    const [currentPath, setCurrentPath] = useState<string>('');

    // Use route change callback to track current path
    const handleRouteChange = (url: string) => {
        setCurrentPath(url);
        console.log('Route changed to:', url);
    };

    useEffect(() => {
        console.log('Dashboard client initialized');

        // Get current URL path and set it
        setCurrentPath(window.location.pathname);
    }, []);

    return (
        <LocationProvider>
            <UserProvider>
                <Layout currentPath={currentPath}>
                    <Router onRouteChange={handleRouteChange}>

                        {/* Home route */}
                        <Route path="/api/next-blog/dashboard" component={Home}/>

                        {/* Blog routes */}
                        <Route path="/api/next-blog/dashboard/blogs" component={BlogsList}/>
                        <Route path="/api/next-blog/dashboard/blogs/create" component={CreateBlog}/>
                        <Route path="/api/next-blog/dashboard/blogs/:id" component={UpdateBlog}/>

                        {/* User routes */}
                        <Route path="/api/next-blog/dashboard/users" component={UsersList}/>
                        <Route path="/api/next-blog/dashboard/users/create" component={CreateUser}/>
                        <Route path="/api/next-blog/dashboard/users/:id" component={UpdateUser}/>

                        {/* Category routes */}
                        <Route path="/api/next-blog/dashboard/categories" component={CategoriesList}/>
                        <Route path="/api/next-blog/dashboard/categories/create" component={CreateCategory}/>
                        <Route path="/api/next-blog/dashboard/categories/:id" component={UpdateCategory}/>

                        {/* Tag routes */}
                        <Route path="/api/next-blog/dashboard/tags" component={TagsList}/>
                        <Route path="/api/next-blog/dashboard/tags/create" component={CreateTag}/>
                        <Route path="/api/next-blog/dashboard/tags/:id" component={UpdateTag}/>
                        <Route path="/api/next-blog/dashboard/settings" component={Settings}/>

                        {/* Settings routes */}
                        <Route path="/api/next-blog/dashboard/settings" component={SettingsList}/>
                        <Route path="/api/next-blog/dashboard/settings/create" component={CreateSetting}/>
                        <Route path="/api/next-blog/dashboard/settings/:id" component={UpdateSetting}/>

                        {/* 404 route */}
                        <Route default component={() => <div>Not Found</div>}/>
                    </Router>
                </Layout>
            </UserProvider>
        </LocationProvider>
    );
}

// Initialize client-side rendering
function initDashboard() {
    const appContainer = document.getElementById('app');
    if (appContainer) {
        console.log('Dashboard client initializing');
        render(<DashboardApp/>, appContainer);
    } else {
        console.error('Dashboard container not found');
    }
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    // DOM already ready, run now
    initDashboard();
}
