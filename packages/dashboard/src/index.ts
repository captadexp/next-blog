// Main entry point for the dashboard package
import './styles/styles.css';

// Export the dashboard components
export * from './dashboard';

// Export the server components
export {default as DashboardPage} from './server/DashboardPage';
export {default as NotFoundPage} from './server/NotFoundPage';

// Export the API client
export {default as ApiClient} from './api/client';

// Export the user context and hook
export {UserProvider, useUser} from './context/UserContext';

// Export types
export * from './types/api';
