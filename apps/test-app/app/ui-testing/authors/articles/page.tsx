import {AuthorArticles} from '@supergrowthai/next-blog-ui';
import {getTestAuthor, getTestAuthorBlogs} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function UITest_Authors_Articles_Page() {
    const author = await getTestAuthor();

    if (!author) {
        return <div style={{padding: 24}}>No author found for testing.</div>;
    }

    const blogs = await getTestAuthorBlogs(author._id);

    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>AuthorArticles</h1>
            <AuthorArticles author={author} blogs={blogs || []}/>
        </div>
    );
}
