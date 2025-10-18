import {AuthorCard} from '@supergrowthai/next-blog-ui';
import {getTestAuthor} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function UITest_Authors_Card_Page() {
    const author = await getTestAuthor();

    if (!author) {
        return <div style={{padding: 24}}>No author found for testing.</div>;
    }

    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>AuthorCard</h1>
            <AuthorCard author={author}/>
        </div>
    );
}
