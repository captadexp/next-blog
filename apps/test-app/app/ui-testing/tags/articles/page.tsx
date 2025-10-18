import {TagArticles} from '@supergrowthai/next-blog-ui';
import {getTestTag, getTestTagBlogs} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function UITest_Tags_Articles_Page() {
    const tag = await getTestTag();

    if (!tag) {
        return <div style={{padding: 24}}>No tag found for testing.</div>;
    }

    const blogs = await getTestTagBlogs(tag.slug);

    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>TagArticles</h1>
            <TagArticles tag={tag} blogs={blogs || []}/>
        </div>
    );
}
