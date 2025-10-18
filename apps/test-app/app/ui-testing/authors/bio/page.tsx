import {AuthorBio} from '@supergrowthai/next-blog-ui';
import {getTestAuthor} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function UITest_Authors_Bio_Page() {
    const author = await getTestAuthor();

    if (!author) {
        return <div style={{padding: 24}}>No author found for testing.</div>;
    }

    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>AuthorBio</h1>
            <AuthorBio
                author={author}
                socialLinks={{
                    twitter: 'https://twitter.com/author',
                    linkedin: 'https://linkedin.com/in/author',
                    github: 'https://github.com/author',
                    website: 'https://author.com'
                }}
            />
        </div>
    );
}
