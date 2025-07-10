
(() => {
    return {
        name: "Structured Data (Schema)",
        version: "1.0.0",
        description: "Automatically adds Article and BlogPosting schema to your posts for richer search results.",
        author: "Your Name",
        url: "http://localhost:3248/plugins/structured-data/1.0.0/plugin.js",
        server: {
            type: "url",
            url: "http://localhost:3248/plugins/structured-data/1.0.0/server.js"
        },
        client: {
            type: "url",
            url: "http://localhost:3248/plugins/structured-data/1.0.0/client.js"
        }
    };
})()
