import {Canonical} from '@supergrowthai/next-blog-ui';
import {getTestBlog} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function UITest_SEO_Canonical_Page() {
    const blog = await getTestBlog();

    if (!blog) {
        return <div style={{padding: 24}}>No blog found for testing Canonical.</div>;
    }

    const baseUrl = 'https://example.com';
    const url = `${baseUrl}/${blog.slug}`;

    // Normally this would be in <head>; for UI testing we render invisibly
    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>SEO Canonical</h1>
            <div style={{display: 'none'}}>
                <Canonical url={url} hrefLang="en"/>
            </div>
            <p>Canonical component rendered (hidden). Inspect page head for canonical link.</p>
        </div>
    );
}
