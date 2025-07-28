(() => {
    return {
        name: "AI Blog Generator",
        version: "1.0.0",
        description: "Automatically generates blog posts using OpenAI.",
        author: "Next-Blog Team",
        url: "http://localhost:3248/plugins/ai-blog-generator/1.0.0/plugin.js",
        server: {
            type: "url",
            url: "http://localhost:3248/plugins/ai-blog-generator/1.0.0/server.js"
        },
        client: {
            type: "url",
            url: "http://localhost:3248/plugins/ai-blog-generator/1.0.0/client.js"
        }
    };
})()