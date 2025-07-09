(() => {
    return {
        name: "Broken Link Checker",
        version: "1.0.0",
        description: "Scans your published posts for broken links and reports them on the dashboard.",
        author: "Next-Blog Team",
        url: "https://next-blog-test-app.vercel.app/plugins/broken-link-checker/1.0.0/plugin.js",
        server: {
            type: "url",
            url: "https://next-blog-test-app.vercel.app/plugins/broken-link-checker/1.0.0/server.js"
        },
        client: {
            type: "url",
            url: "https://next-blog-test-app.vercel.app/plugins/broken-link-checker/1.0.0/client.js"
        }
    };
})()
