import {CategoryCard} from '@supergrowthai/next-blog-ui';
import {getTestCategory} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function UITest_Categories_Card_Page() {
    const category = await getTestCategory();

    if (!category) {
        return <div style={{padding: 24}}>No category found for testing.</div>;
    }

    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>CategoryCard</h1>
            <CategoryCard category={category}/>
        </div>
    );
}
