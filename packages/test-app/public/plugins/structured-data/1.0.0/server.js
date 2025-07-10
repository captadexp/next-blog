
(() => {
    const SETTINGS_KEY = 'plugin_structured_data';

    const getSettings = async (sdk) => {
        const response = await sdk.db.findOne('settings', { query: { key: SETTINGS_KEY } });
        return response.payload || {};
    };

    const saveSettings = async (sdk, newSettings) => {
        await sdk.db.updateOne('settings', { key: SETTINGS_KEY }, { key: SETTINGS_KEY, value: newSettings }, { upsert: true });
        return { code: 0, message: 'Settings saved.' };
    };

    const generateArticleSchema = async (sdk, blogPost) => {
        try {
            const settings = await getSettings(sdk);
            const siteSettings = sdk.settings.get();
            const siteUrl = siteSettings?.site?.url;
            const siteName = siteSettings?.site?.name || 'Your Blog';

            if (!siteUrl) {
                sdk.log.error("Structured Data: Site URL is not configured. Schema will be incomplete.");
                return null;
            }

            const author = blogPost.author || { name: 'Default Author' };

            const schema = {
                "@context": "https://schema.org",
                "@type": "BlogPosting",
                "mainEntityOfPage": {
                    "@type": "WebPage",
                    "@id": `${siteUrl}/blogs/${blogPost.slug}`
                },
                "headline": blogPost.title,
                "description": blogPost.excerpt || blogPost.content.substring(0, 150),
                "image": blogPost.featuredImage || `${siteUrl}/default-image.jpg`,
                "author": {
                    "@type": "Person",
                    "name": author.name
                },
                "publisher": {
                    "@type": "Organization",
                    "name": settings.publisherName || siteName,
                    "logo": {
                        "@type": "ImageObject",
                        "url": settings.publisherLogo || `${siteUrl}/logo.png`
                    }
                },
                "datePublished": new Date(blogPost.createdAt).toISOString(),
                "dateModified": new Date(blogPost.updatedAt).toISOString()
            };

            const scriptTag = `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`;

            return {
                head: {
                    append: scriptTag
                }
            };

        } catch (error) {
            sdk.log.error(`Structured data generation failed for post ${blogPost._id}: ${error.message}`);
            return null;
        }
    };

    return {
        hooks: {
            "before-render-blog-post": generateArticleSchema,
        },
        rpc: {
            getStructuredDataSettings: getSettings,
            saveStructuredDataSettings: saveSettings,
        }
    };
})();
