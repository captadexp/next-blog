(() => {
    return {
        name: "Broken Link Checker",
        version: "1.0.0",
        description: "Scans your published posts for broken links and reports them on the dashboard.",
        author: "Your Name",
        url: "http://localhost:3248/plugins/broken-link-checker/1.0.0/plugin.js",
        server: {
            type: "url",
            url: "http://localhost:3248/plugins/broken-link-checker/1.0.0/server.js"
        },
        client: {
            type: "url",
            url: "http://localhost:3248/plugins/broken-link-checker/1.0.0/client.js"
        }
    };
})()
