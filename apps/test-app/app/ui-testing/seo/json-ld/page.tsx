import {JsonLd} from '@supergrowthai/next-blog-ui';
import {getTestBlog} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function UITest_SEO_JsonLd_Page() {
    const blog = await getTestBlog();

    if (!blog) {
        return <div style={{padding: 24}}>No blog found for testing JsonLd.</div>;
    }

    const baseUrl = 'https://example.com';
    const siteName = 'Test Blog Site';

    // Normally this would be in <head>; for UI testing we render invisibly
    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>SEO JsonLd</h1>
            <div style={{display: 'none'}}>
                <JsonLd
                    blog={blog}
                    organization={{
                        name: siteName,
                        url: baseUrl,
                        logo: `${baseUrl}/logo.png`
                    }}
                    website={{
                        name: siteName,
                        url: baseUrl,
                        searchAction: true
                    }}
                />
            </div>
            <p>JsonLd component rendered (hidden). View page source to inspect structured data.</p>
        </div>
    );
}
