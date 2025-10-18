import React from 'react';
import {getTestCategory, getTestCategoryBlogs} from '../../test-data';
import {CategoryPage} from '@supergrowthai/next-blog-ui';
import "@supergrowthai/next-blog-ui/style.css";

export default async function TestCategoryPage() {
    const category = await getTestCategory();
    const blogs = category ? await getTestCategoryBlogs(category.slug) : [];

    if (!category) {
        return (
            <div style={{padding: '40px', textAlign: 'center'}}>
                <h1>No Category Found</h1>
                <p>Please add some categories to your database first.</p>
            </div>
        );
    }

    return (
        <CategoryPage
            category={category}
            blogs={blogs}
            showDescription={true}
            showBlogExcerpts={true}
            blogsPerPage={10}
        />
    );
}