(() => {
    return {
        name: "Test Plugin",
        version: "1.0.0",
        description: "A plugin to test client and server hooks.",
        author: "Next-Blog Team",
        url: "https://next-blog-test-app.vercel.app/plugins/test-plugin/1.0.0/plugin.js",
        server: {
            type: "url",
            url: "https://next-blog-test-app.vercel.app/plugins/test-plugin/1.0.0/server.js"
        },
        client: {
            type: "url",
            url: "https://next-blog-test-app.vercel.app/plugins/test-plugin/1.0.0/client.js"
        }
    };
})()
