import {BlogExcerpt} from '@supergrowthai/next-blog-ui';
import {getTestBlogs} from '../../test-data';

export default async function BlogExcerptTestPage() {
    const blogs = await getTestBlogs(3);

    if (!blogs || blogs.length === 0) {
        return <div>No blogs found for testing</div>;
    }

    return (
        <div style={{padding: '40px'}}>
            <h1 style={{marginBottom: '40px'}}>BlogExcerpt Component Test</h1>

            {blogs.map((blog, index) => (
                <div key={blog._id} style={{marginBottom: '60px'}}>
                    <h2 style={{marginBottom: '10px', fontSize: '20px', color: '#1f2937'}}>
                        {blog.title}
                    </h2>

                    <div style={{marginBottom: '30px'}}>
                        <h3 style={{marginBottom: '10px', fontSize: '16px'}}>Default (200 chars)</h3>
                        <div style={{padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px'}}>
                            <BlogExcerpt blog={blog}/>
                        </div>
                    </div>

                    <div style={{marginBottom: '30px'}}>
                        <h3 style={{marginBottom: '10px', fontSize: '16px'}}>Short (100 chars)</h3>
                        <div style={{padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px'}}>
                            <BlogExcerpt blog={blog} maxLength={100}/>
                        </div>
                    </div>

                    <div style={{marginBottom: '30px'}}>
                        <h3 style={{marginBottom: '10px', fontSize: '16px'}}>Long (300 chars)</h3>
                        <div style={{padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px'}}>
                            <BlogExcerpt blog={blog} maxLength={300}/>
                        </div>
                    </div>

                    <div style={{marginBottom: '30px'}}>
                        <h3 style={{marginBottom: '10px', fontSize: '16px'}}>Without Ellipsis</h3>
                        <div style={{padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px'}}>
                            <BlogExcerpt blog={blog} showEllipsis={false}/>
                        </div>
                    </div>

                    <div style={{marginBottom: '30px'}}>
                        <h3 style={{marginBottom: '10px', fontSize: '16px'}}>Custom Style</h3>
                        <div style={{padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px'}}>
                            <BlogExcerpt
                                blog={blog}
                                style={{
                                    fontSize: '18px',
                                    lineHeight: 1.8,
                                    color: '#4b5563',
                                    fontStyle: 'italic'
                                }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}