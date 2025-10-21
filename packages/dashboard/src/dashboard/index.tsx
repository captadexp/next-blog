import {h, render} from 'preact';
import {createPortal} from 'preact/compat';
import {LocationProvider, Route, Router, useLocation} from 'preact-iso';
import {UserProvider} from '../context/UserContext';
import '../styles/styles.css';
// Import pages
import {Layout} from './components/Layout';

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

// Import settings pages
import SettingsList from './pages/settings/List';
import CreateSetting from './pages/settings/Create';
import UpdateSetting from './pages/settings/Update';

// Import plugins pages
import PluginsList from './pages/plugins/List';
import CreatePlugin from './pages/plugins/Create';
import PluginPanel from './pages/plugins/Panel';

import {Toaster} from 'react-hot-toast';
import {PluginProvider} from '../context/PluginContext';
import {IntentProvider} from '../intent';
import Login from "./pages/Login.tsx";
import Home from "./pages/Home.tsx";


export const withLayout = (Page: any) => (props: any) => {
    const {path} = useLocation();
    return (
        <Layout currentPath={path}>
            <Page {...props} />
        </Layout>
    );
};

// Main Dashboard App
function DashboardApp() {

    // Use route change callback to track current path
    const handleRouteChange = (url: string) => {
        console.log('Route changed to:', url);
    };

    return (
        <LocationProvider>
            <>
                <UserProvider>
                    <PluginProvider>
                        <IntentProvider>

                            <Router onRouteChange={handleRouteChange}>
                                <Route path={"/api/next-blog/dashboard/login"} component={Login}/>

                                {/* Home route */}
                                <Route path="/api/next-blog/dashboard" component={withLayout(Home)}/>

                                {/* Blog routes */}
                                <Route path="/api/next-blog/dashboard/blogs" component={withLayout(BlogsList)}/>
                                <Route path="/api/next-blog/dashboard/blogs/create"
                                       component={withLayout(CreateBlog)}/>
                                <Route path="/api/next-blog/dashboard/blogs/:id"
                                       component={withLayout(UpdateBlog)}/>

                                {/* User routes */}
                                <Route path="/api/next-blog/dashboard/users" component={withLayout(UsersList)}/>
                                <Route path="/api/next-blog/dashboard/users/create"
                                       component={withLayout(CreateUser)}/>
                                <Route path="/api/next-blog/dashboard/users/:id"
                                       component={withLayout(UpdateUser)}/>

                                {/* Category routes */}
                                <Route path="/api/next-blog/dashboard/categories"
                                       component={withLayout(CategoriesList)}/>
                                <Route path="/api/next-blog/dashboard/categories/create"
                                       component={withLayout(CreateCategory)}/>
                                <Route path="/api/next-blog/dashboard/categories/:id"
                                       component={withLayout(UpdateCategory)}/>

                                {/* Tag routes */}
                                <Route path="/api/next-blog/dashboard/tags" component={withLayout(TagsList)}/>
                                <Route path="/api/next-blog/dashboard/tags/create"
                                       component={withLayout(CreateTag)}/>
                                <Route path="/api/next-blog/dashboard/tags/:id" component={withLayout(UpdateTag)}/>

                                {/* Settings routes */}
                                <Route path="/api/next-blog/dashboard/settings"
                                       component={withLayout(SettingsList)}/>
                                <Route path="/api/next-blog/dashboard/settings/create"
                                       component={withLayout(CreateSetting)}/>
                                <Route path="/api/next-blog/dashboard/settings/:id"
                                       component={withLayout(UpdateSetting)}/>

                                {/* Plugin routes */}
                                <Route path="/api/next-blog/dashboard/plugins" component={withLayout(PluginsList)}/>
                                <Route path="/api/next-blog/dashboard/plugins/create"
                                       component={withLayout(CreatePlugin)}/>
                                <Route path="/api/next-blog/dashboard/plugins/:pluginId"
                                       component={withLayout(PluginPanel)}/>


                                {/* 404 route */}
                                <Route default component={() => <div>Not Found</div>}/>
                            </Router>
                        </IntentProvider>
                    </PluginProvider>
                </UserProvider>
                {createPortal(<Toaster/>, document.body)}
            </>
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
