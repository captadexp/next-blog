import {BlogMeta} from '@supergrowthai/next-blog-ui';
import {getTestBlog} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function BlogMetaTestPage() {
    const blog = await getTestBlog();

    if (!blog) {
        return <div>No blog found for testing</div>;
    }

    return (
        <div style={{padding: '40px'}}>
            <h1 style={{marginBottom: '40px'}}>BlogMeta Component Test</h1>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Default (All meta)</h2>
                <BlogMeta blog={blog}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Date Only</h2>
                <BlogMeta blog={blog} showCategory={false} showTags={false}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Category Only</h2>
                <BlogMeta blog={blog} showDate={false} showTags={false}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Tags Only</h2>
                <BlogMeta blog={blog} showDate={false} showCategory={false}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>With Read Time</h2>
                <BlogMeta blog={blog} showReadTime={true}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Short Date Format</h2>
                <BlogMeta blog={blog} dateFormat="short"/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Relative Date Format</h2>
                <BlogMeta blog={blog} dateFormat="relative"/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Custom Styles</h2>
                <BlogMeta
                    blog={blog}
                    style={{fontSize: '16px', color: '#2563eb'}}
                    itemStyle={{fontWeight: 'bold'}}
                />
            </div>
        </div>
    );
}