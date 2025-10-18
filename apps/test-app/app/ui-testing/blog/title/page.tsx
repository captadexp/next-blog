import {BlogTitle} from '@supergrowthai/next-blog-ui';
import {getTestBlog} from '../../test-data';

export default async function BlogTitleTestPage() {
    const blog = await getTestBlog();

    if (!blog) {
        return <div>No blog found for testing</div>;
    }

    return (
        <div style={{padding: '40px'}}>
            <h1 style={{marginBottom: '40px'}}>BlogTitle Component Test</h1>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Default (h1)</h2>
                <BlogTitle blog={blog}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Level 2 (h2)</h2>
                <BlogTitle blog={blog} level={2}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Level 3 (h3)</h2>
                <BlogTitle blog={blog} level={3}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Custom Style</h2>
                <BlogTitle blog={blog} style={{color: '#2563eb', fontSize: '3rem'}}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>With Custom Class</h2>
                <BlogTitle blog={blog} className="custom-title-class"/>
            </div>
        </div>
    );
}