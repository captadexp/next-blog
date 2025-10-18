import {TagCloud} from '@supergrowthai/next-blog-ui';
import {getTestTags} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function UITest_Tags_Cloud_Page() {
    const tags = await getTestTags();

    if (!tags || tags.length === 0) {
        return <div style={{padding: 24}}>No tags found for testing.</div>;
    }

    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>TagCloud</h1>
            <TagCloud tags={tags}/>
        </div>
    );
}
