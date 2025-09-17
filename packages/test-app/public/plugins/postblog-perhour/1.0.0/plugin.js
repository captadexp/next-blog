(() => {
    return {
        name: "Post Blog Per Hour",
        version: "1.0.0",
        description: "Automatically generates a simple blog post every 12 hour.",
        author: "Ayush",
        url: "http://localhost:3248/plugins/postblog-perhour/1.0.0/plugin.js",
        server: {
            type: "url",
            url: "http://localhost:3248/plugins/postblog-perhour/1.0.0/server.js"
        },
        client: {
            type: "url",
            url: "http://localhost:3248/plugins/postblog-perhour/1.0.0/client.js"
        }
    };
})()