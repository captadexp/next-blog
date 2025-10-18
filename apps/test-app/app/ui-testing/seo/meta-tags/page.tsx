import {MetaTags} from '@supergrowthai/next-blog-ui';
import {getTestBlog} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function UITest_SEO_MetaTags_Page() {
    const blog = await getTestBlog();

    if (!blog) {
        return <div style={{padding: 24}}>No blog found for testing MetaTags.</div>;
    }

    const baseUrl = 'https://example.com';
    const siteName = 'Test Blog Site';

    // Normally this would be in <head>; for UI testing we render invisibly
    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>SEO MetaTags</h1>
            <div style={{display: 'none'}}>
                <MetaTags
                    type="blog"
                    blog={blog}
                    baseUrl={baseUrl}
                    siteName={siteName}
                    twitterHandle="@testblog"
                />
            </div>
            <p>MetaTags component rendered (hidden). Inspect page head to verify tags.</p>
        </div>
    );
}
