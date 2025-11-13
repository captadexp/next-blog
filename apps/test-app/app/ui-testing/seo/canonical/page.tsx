import {SEO} from '@supergrowthai/next-blog-ui';
import {getTestBlog} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";
import nextBlogConfig from "@/lib/next-blog-config";

export default async function UITest_SEO_Canonical_Page() {
    const blog = await getTestBlog();

    if (!blog) {
        return <div style={{padding: 24}}>No blog found for testing SEO.</div>;
    }

    // Normally this would be in <head>; for UI testing we render invisibly
    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>SEO Component (includes Canonical)</h1>
            <div style={{display: 'none'}}>
                <SEO
                    entity={blog}
                    entityType="blog"
                    config={nextBlogConfig()}
                />
            </div>
            <p>SEO component rendered (hidden). Inspect page head for canonical link and meta tags.</p>
        </div>
    );
}
