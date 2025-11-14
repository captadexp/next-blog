import {getTestBlog} from '../../test-data';
import {generateJsonLd} from '@supergrowthai/next-blog-ui';
import "@supergrowthai/next-blog-ui/style.css";
import nextBlogConfig from "@/lib/next-blog-config";
import {createServerSDK} from "@supergrowthai/next-blog/next";

/**
 * Example of server-side JSON-LD generation for SEO testing.
 *
 * This demonstrates the new server-side SEO pattern:
 * - Generate structured data during SSR
 * - Use generateJsonLd() utility with plugin RPC
 * - Handle errors gracefully with .catch()
 * - Display generated JSON-LD for debugging
 */
export default async function UITest_SEO_JsonLd_Page() {
    const blog = await getTestBlog();

    if (!blog) {
        return <div style={{padding: 24}}>No blog found for testing SEO.</div>;
    }

    // Generate JSON-LD server-side using the json-ld-structured-data plugin
    const sdk = await createServerSDK(nextBlogConfig());
    const jsonLd = await generateJsonLd({entity: blog, entityType: 'blog', sdk}).catch(() => null);

    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>Server-Side JSON-LD Generation</h1>

            {/* Example: How to inject JSON-LD in production */}
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}
                />
            )}

            <p>
                JSON-LD generated server-side for better SEO performance.
                In production, this would be in the document head for search engines to crawl.
            </p>

            <p><strong>Best Practice:</strong> Use this pattern in your page components after generateMetadata().</p>

            {/* Debug view for development */}
            <details style={{marginTop: 16}}>
                <summary>Generated JSON-LD (Debug View)</summary>
                <pre style={{background: '#f5f5f5', padding: 16, overflow: 'auto'}}>
                    {JSON.stringify(jsonLd, null, 2)}
                </pre>
            </details>
        </div>
    );
}
