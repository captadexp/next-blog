import {TagCard} from '@supergrowthai/next-blog-ui';
import {getTestTag} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function UITest_Tags_Card_Page() {
    const tag = await getTestTag();

    if (!tag) {
        return <div style={{padding: 24}}>No tag found for testing.</div>;
    }

    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>TagCard</h1>
            <TagCard tag={tag}/>
        </div>
    );
}
