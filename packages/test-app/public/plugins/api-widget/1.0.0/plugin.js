(() => {
    return {
        name: "API Widget",
        version: "1.0.0",
        description: "A dashboard widget that fetches data from the Next-Blog API.",
        author: "Next-Blog Team",
        url: "http://localhost:3248/plugins/api-widget/1.0.0/plugin.js",
        client: {
            type: "url",
            url: "http://localhost:3248/plugins/api-widget/1.0.0/client.js"
        }
    };
})()
