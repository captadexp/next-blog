import React from 'react';
import {getTestTag, getTestTagBlogs} from '../../test-data';
import {TagPage} from '@supergrowthai/next-blog-ui';
import "@supergrowthai/next-blog-ui/style.css";

export default async function TestTagPage() {
    const tag = await getTestTag();
    const blogs = tag ? await getTestTagBlogs(tag.slug) : [];

    if (!tag) {
        return (
            <div style={{padding: '40px', textAlign: 'center'}}>
                <h1>No Tag Found</h1>
                <p>Please add some tags to your database first.</p>
            </div>
        );
    }

    return (
        <TagPage
            tag={tag}
            blogs={blogs}
            showBlogExcerpts={true}
            blogsPerPage={10}
        />
    );
}