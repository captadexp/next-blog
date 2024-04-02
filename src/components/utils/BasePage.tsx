import React from "react";

export default function BasePage({children, title}: { children: any, title?: string }) {

    return <html lang="en">
    <head>
        <meta charSet="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>{title || "Dashboard"}</title>
        <style dangerouslySetInnerHTML={{
            __html: `
     /* Basic reset for body margin and padding */
        body, html {
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%;
    }

        /* Flex container to center content */
        .centered-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        width: 100%;
        background-color: #f0f0f0; /* Light grey background */
    }

        /* Elevated effect for child content */
        .elevated-content {
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Simple shadow for depth */
        background-color: #ffffff; /* White background */
        padding: 20px; /* Spacing around the content */
        border-radius: 8px; /* Optional: rounded corners */
    }
    `
        }}>
        </style>
    </head>
    <body>

    <div className="centered-container">
        <div className="elevated-content">
            {children}
        </div>
    </div>

    </body>
    </html>

}
