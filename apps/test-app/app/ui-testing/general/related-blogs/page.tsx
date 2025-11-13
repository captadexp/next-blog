import {RelatedBlogs} from '@supergrowthai/next-blog-ui';
import {getRelatedTestBlogs, getTestBlog} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function RelatedBlogsTestPage() {
    const blog = await getTestBlog();

    if (!blog) {
        return <div style={{padding: 24}}>No blog found for testing.</div>;
    }

    const relatedBlogs = await getRelatedTestBlogs(blog._id);

    if (!relatedBlogs || relatedBlogs.length === 0) {
        return <div style={{padding: 24}}>No related blogs found for testing.</div>;
    }

    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>RelatedBlogs</h1>
            <RelatedBlogs
                blogs={relatedBlogs}
                currentBlogId={blog._id}
                title="You Might Also Like"
                layout="cards"
                columns={{sm: 1, md: 2, lg: 3}}
            />
        </div>
    );
}
