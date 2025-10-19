'use client'
import {CategoryTree} from '@supergrowthai/next-blog-ui';
import {getTestCategories} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function UITest_Categories_Tree_Page() {
    const categories = await getTestCategories();

    if (!categories || categories.length === 0) {
        return <div style={{padding: 24}}>No categories found for testing.</div>;
    }

    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>CategoryTree</h1>
            <CategoryTree categories={categories}/>
        </div>
    );
}
