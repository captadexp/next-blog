import {h} from "preact";

export default function BasePage({children}: { children: any, title?: string }) {
    return <html lang="en">
    <head>
        <meta charSet="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        {/* Ensure proper client-side routing by adding base href */}
        <base href="/api/next-blog/"/>
        {/* Meta tag to ensure the initial server-side response doesn't cache */}
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"/>
        <meta http-equiv="Pragma" content="no-cache"/>
        <meta http-equiv="Expires" content="0"/>
    </head>
    <body className="bg-gray-50">
    {children}
    </body>
    </html>
}
