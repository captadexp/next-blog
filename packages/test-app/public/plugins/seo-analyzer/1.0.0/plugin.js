(() => {
    return {
        name: "Content SEO Analyzer",
        version: "1.0.0",
        description: "Analyzes post content for SEO best practices.",
        author: "Next-Blog Team",
        url: "http://localhost:3248/plugins/seo-analyzer/1.0.0/plugin.js",
        server: {
            type: "url",
            url: "http://localhost:3248/plugins/seo-analyzer/1.0.0/server.js"
        },
        client: {
            type: "url",
            url: "http://localhost:3248/plugins/seo-analyzer/1.0.0/client1.js"
        }
    };
})()
