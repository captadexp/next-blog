
(() => {
    const generateSitemap = async (sdk) => {
        try {
            const settings = await sdk.settings.get();
            const siteUrl = settings?.site?.url;

            if (!siteUrl) {
                throw new Error("Site URL is not configured in the settings. Please set it up first.");
            }

            const blogsResponse = await sdk.apis.getBlogs({ status: 'published' });
            if (blogsResponse.code !== 0) {
                throw new Error("Failed to fetch published blogs.");
            }

            const urls = blogsResponse.payload.map(blog => {
                const lastMod = new Date(blog.updatedAt || blog.createdAt).toISOString();
                // Assuming a blog URL structure of /blogs/:slug
                const loc = `${siteUrl}/blogs/${blog.slug}`;
                return `
    <url>
        <loc>${loc}</loc>
        <lastmod>${lastMod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
            });

            // Add the homepage
            urls.unshift(`
    <url>
        <loc>${siteUrl}</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>`);

            const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls.join('')}
</urlset>`;

            // This is a critical step: writing the file to the public directory of the main app.
            // This assumes the plugin has the necessary permissions and knows the path.
            // For this example, we'll assume the path is relative to the project root.
            const sitemapPath = 'packages/test-app/public/sitemap.xml';
            await sdk.fs.writeFile(sitemapPath, sitemapContent);

            const generationDate = new Date().toISOString();
            sdk.cache.set('sitemap_last_generated', generationDate);

            return { code: 0, message: "Sitemap generated successfully.", payload: { generatedAt: generationDate } };

        } catch (error) {
            sdk.log.error(`Sitemap generation failed: ${error.message}`);
            return { code: 1, message: error.message, payload: null };
        }
    };

    return {
        rpc: {
            generateSitemap,
            getSitemapStatus: async (sdk) => {
                const lastGenerated = sdk.cache.get('sitemap_last_generated');
                return { code: 0, payload: { lastGenerated } };
            }
        }
    };
})();
