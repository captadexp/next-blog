import {getTestBlog} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function UITest_SEO_Canonical_Page() {
    const blog = await getTestBlog();

    if (!blog) {
        return <div style={{padding: 24}}>No blog found for testing SEO.</div>;
    }

    // Normally this would be in <head>; for UI testing we render invisibly
    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>SEO Component (includes Canonical)</h1>
            {/* Server-side JSON-LD generation - would be handled by generateMetadata in real app */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Article",
                        "headline": blog.title,
                        "description": blog.excerpt
                    })
                }}
            />
            <p>SEO component rendered (hidden). Inspect page head for canonical link and meta tags.</p>
        </div>
    );
}
