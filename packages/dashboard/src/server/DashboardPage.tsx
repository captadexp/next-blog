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
            <div id="app">
                {/* Loading indicator while client-side JavaScript loads */}
                <div className="p-5 text-center">
                    <div className="text-lg text-gray-600 mb-3">
                        Loading dashboard...
                    </div>
                    <div
                        className="w-10 h-10 mx-auto border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                </div>

                {/* Fallback for users with JavaScript disabled */}
                <noscript>
                    <div className="p-5 text-center bg-red-100 text-red-800 rounded mt-5">
                        JavaScript is required for the dashboard to function.
                    </div>
                </noscript>
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
