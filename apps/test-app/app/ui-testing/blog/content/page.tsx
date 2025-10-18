import {BlogContent} from '@supergrowthai/next-blog-ui';
import {getTestBlog} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function BlogContentTestPage() {
    const blog = await getTestBlog();

    if (!blog) {
        return <div>No blog found for testing</div>;
    }

    return (
        <div style={{padding: '40px'}}>
            <h1 style={{marginBottom: '40px'}}>BlogContent Component Test</h1>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Default Rendering</h2>
                <div style={{border: '1px solid #e5e7eb', padding: '20px', borderRadius: '8px'}}>
                    <BlogContent blog={blog}/>
                </div>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Custom Style</h2>
                <div style={{border: '1px solid #e5e7eb', padding: '20px', borderRadius: '8px'}}>
                    <BlogContent
                        blog={blog}
                        style={{
                            fontSize: '18px',
                            lineHeight: 2,
                            color: '#374151',
                            fontFamily: 'Georgia, serif'
                        }}
                    />
                </div>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>With Max Width</h2>
                <div style={{border: '1px solid #e5e7eb', padding: '20px', borderRadius: '8px'}}>
                    <BlogContent
                        blog={blog}
                        style={{maxWidth: '600px', margin: '0 auto'}}
                    />
                </div>
            </div>
        </div>
    );
}