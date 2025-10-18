import {RecentBlogs} from '@supergrowthai/next-blog-ui';
import {getTestBlogs} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function RecentBlogsTestPage() {
    const blogs = await getTestBlogs(6);

    if (!blogs || blogs.length === 0) {
        return <div style={{padding: 24}}>No blogs found for testing.</div>;
    }

    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>RecentBlogs</h1>
            <RecentBlogs blogs={blogs} title="Recent Posts"/>
        </div>
    );
}
