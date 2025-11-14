import {getTestBlog} from '../../test-data';
import {generateJsonLd} from '@supergrowthai/next-blog-ui';
import "@supergrowthai/next-blog-ui/style.css";
import nextBlogConfig from "@/lib/next-blog-config";
import {createServerSDK} from "@supergrowthai/next-blog/next";

/**
 * Example demonstrating SEO meta tags and JSON-LD integration.
 *
 * Best practices shown:
 * - Use generateMetadata() for meta tags (not shown here but recommended)
 * - Generate JSON-LD server-side for structured data
 * - Handle plugin failures gracefully
 * - Combine multiple SEO strategies (meta tags + structured data)
 */
export default async function UITest_SEO_MetaTags_Page() {
    const blog = await getTestBlog();

    if (!blog) {
        return <div style={{padding: 24}}>No blog found for testing SEO.</div>;
    }

    // Generate structured data server-side
    const sdk = await createServerSDK(nextBlogConfig());
    const jsonLd = await generateJsonLd({entity: blog, entityType: 'blog', sdk}).catch(() => null);

    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>SEO Meta Tags + JSON-LD Example</h1>

            {/* Server-side JSON-LD injection */}
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}
                />
            )}

            <div style={{background: '#f0f7ff', padding: 16, marginBottom: 16, borderRadius: 4}}>
                <h3 style={{margin: '0 0 8px 0'}}>Production Implementation:</h3>
                <p style={{margin: 0}}>
                    In a real application, implement <code>generateMetadata()</code> to generate
                    Open Graph, Twitter Cards, and canonical URLs. This page demonstrates the
                    JSON-LD portion of a complete SEO strategy.
                </p>
            </div>

            <p>
                <strong>Meta tags</strong> should be handled via Next.js <code>generateMetadata()</code><br/>
                <strong>Structured data</strong> is generated here via <code>generateJsonLd()</code>
            </p>

            <details style={{marginTop: 16}}>
                <summary>Generated JSON-LD Structure</summary>
                <pre style={{background: '#f5f5f5', padding: 16, overflow: 'auto'}}>
                    {JSON.stringify(jsonLd, null, 2)}
                </pre>
            </details>
        </div>
    );
}
