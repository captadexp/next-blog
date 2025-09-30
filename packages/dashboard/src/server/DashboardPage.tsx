import {h} from "preact";
import BasePage from "../components/utils/BasePage";
import {renderToString} from "preact-render-to-string";

/**
 * Server-side shell for the dashboard client application
 * This renders the initial HTML structure and loads the client-side JavaScript
 */
export default function DashboardPage() {
    return (
        <BasePage>
            {/* App container for client-side rendering */}
            <div id="app" style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {/* Loading indicator while client-side JavaScript loads */}
                <div style={{textAlign: 'center'}}>
                    <div style={{fontSize: '18px', color: '#4B5563', marginBottom: '12px'}}>
                        Loading dashboard...
                    </div>
                    <div
                        style={{
                            width: '40px',
                            height: '40px',
                            margin: '0 auto',
                            border: '4px solid #E5E7EB',
                            borderTopColor: '#3B82F6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }}></div>
                </div>

                {/* Fallback for users with JavaScript disabled */}
                <noscript>
                    <div style={{
                        padding: '20px',
                        textAlign: 'center',
                        backgroundColor: '#FEE2E2',
                        color: '#991B1B',
                        borderRadius: '4px',
                        marginTop: '20px'
                    }}>
                        JavaScript is required for the dashboard to function.
                    </div>
                </noscript>

                {/* CSS for spinner animation */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                        @keyframes spin {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                    `
                }}></style>
            </div>

            {/* Load plugin runtime first (global) */}
            <script src={"/api/next-blog/dashboard/static/plugin-runtime.js"}></script>

            {/* Client-side scripts and styles */}
            <script type="module" src={"/api/next-blog/dashboard/static/dashboard.js"}></script>
        </BasePage>
    );
}

DashboardPage.toString = function () {
    return renderToString(<DashboardPage/>, {})
}
