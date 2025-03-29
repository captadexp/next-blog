import {h} from "preact"
import BasePage from "../../components/utils/BasePage";

/**
 * Server-side shell for the dashboard client application
 * This renders the initial HTML structure and loads the client-side JavaScript
 */
export default function dashboard() {
    return (
        <BasePage title="Next-Blog Dashboard">
            {/* App container for client-side rendering */}
            <div id="app">
                {/* Loading indicator while client-side JavaScript loads */}
                <div style={{
                    padding: "20px",
                    textAlign: "center"
                }}>
                    <div style={{
                        fontSize: "1.2rem",
                        color: "#666",
                        marginBottom: "10px"
                    }}>
                        Loading dashboard...
                    </div>
                    <div style={{
                        width: "40px",
                        height: "40px",
                        margin: "0 auto",
                        border: "4px solid #f3f3f3",
                        borderTop: "4px solid #3498db",
                        borderRadius: "50%",
                    }}></div>
                </div>

                {/* Fallback for users with JavaScript disabled */}
                <noscript>
                    <div style={{
                        padding: "20px",
                        textAlign: "center",
                        backgroundColor: "#f8d7da",
                        color: "#721c24",
                        borderRadius: "5px",
                        marginTop: "20px"
                    }}>
                        JavaScript is required for the dashboard to function.
                    </div>
                </noscript>
            </div>

            {/* Client-side scripts */}
            <script type="module" src="/api/next-blog/static/dashboard.js"></script>

            {/* Add minimal CSS animations for loading spinner */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                #app > div > div:last-child {
                    animation: spin 1s linear infinite;
                }
                `
            }}/>
        </BasePage>
    );
}