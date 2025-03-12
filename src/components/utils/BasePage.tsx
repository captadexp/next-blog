import {useContext} from "preact/hooks";
import {NavigationContext} from "../providers/NavigationProvider";

export default function BasePage({children, title}: { children: any; title?: string }) {
    const navContext = useContext(NavigationContext);

    return (
        <html lang="en">
        <head>
            <meta charSet="UTF-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <title>{title || "Dashboard"}</title>
            <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
        </head>
        <body>
        <div className="flex justify-center items-center h-screen w-screen bg-gray-100">
            <div className="max-w-[90dvw] max-h-[90dvh] overflow-scroll shadow-md bg-white p-5 rounded-lg relative">
                {navContext?.fromDashboard && (
                    <button
                        onClick={navContext.goBack}
                        className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 transition"
                    >
                        ← Back
                    </button>
                )}
                {children}
            </div>
        </div>
        </body>
        </html>
    );
}
