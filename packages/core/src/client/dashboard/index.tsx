import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Router, Route, LocationProvider, useLocation } from 'preact-iso';

// Import pages
import Home from './pages/Home';
import { Layout } from './components/Layout';

// Import section pages
import BlogsList from './pages/blogs/List';
import AuthorsList from './pages/authors/List';
import NotFound from '../../components/NotFound';

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
      <Layout currentPath={currentPath}>
        <Router onRouteChange={handleRouteChange}>
          <Route path="/api/next-blog/dashboard" component={Home} />
          <Route path="/api/next-blog/dashboard/blogs" component={BlogsList} />
          <Route path="/api/next-blog/dashboard/authors" component={AuthorsList} />
          {/* Add routes for all dashboard pages */}
          <Route default component={NotFound} />
        </Router>
      </Layout>
    </LocationProvider>
  );
}

// Initialize client-side rendering
function initDashboard() {
  const appContainer = document.getElementById('app');
  if (appContainer) {
    console.log('Dashboard client initializing');
    render(<DashboardApp />, appContainer);
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