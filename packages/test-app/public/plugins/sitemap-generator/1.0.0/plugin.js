
(() => {
    return {
        name: "Sitemap Generator",
        version: "1.0.0",
        description: "Generates a sitemap.xml file for better search engine indexing.",
        author: "Your Name",
        url: "http://localhost:3248/plugins/sitemap-generator/1.0.0/plugin.js",
        server: {
            type: "url",
            url: "http://localhost:3248/plugins/sitemap-generator/1.0.0/server.js"
        },
        client: {
            type: "url",
            url: "http://localhost:3248/plugins/sitemap-generator/1.0.0/client.js"
        }
    };
})()
