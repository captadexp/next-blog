import {CategoryArticles} from '@supergrowthai/next-blog-ui';
import {getTestCategory, getTestCategoryBlogs} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function UITest_Categories_Articles_Page() {
    const category = await getTestCategory();

    if (!category) {
        return <div style={{padding: 24}}>No category found for testing.</div>;
    }

    const blogs = await getTestCategoryBlogs(category.slug);

    return (
        <div style={{padding: 24}}>
            <h1 style={{marginBottom: 16}}>CategoryArticles</h1>
            <CategoryArticles category={category} blogs={blogs || []}/>
        </div>
    );
}
