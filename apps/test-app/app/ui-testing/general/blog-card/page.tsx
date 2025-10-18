import {BlogCard} from '@supergrowthai/next-blog-ui';
import {getTestBlog} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function BlogCardTestPage() {
    const blog = await getTestBlog();

    if (!blog) {
        return <div style={{padding: 24}}>No blog found for testing.</div>;
    }

    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>BlogCard</h1>
            <BlogCard blog={blog}/>
        </div>
    );
}
