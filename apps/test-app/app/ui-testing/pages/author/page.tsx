import React from 'react';
import {getTestAuthor, getTestAuthorBlogs} from '../../test-data';
import {AuthorPage} from '@supergrowthai/next-blog-ui';
import "@supergrowthai/next-blog-ui/style.css";

export default async function TestAuthorPage() {
    const author = await getTestAuthor();
    const blogs = author ? await getTestAuthorBlogs(author._id) : [];

    if (!author) {
        return (
            <div style={{padding: '40px', textAlign: 'center'}}>
                <h1>No Author Found</h1>
                <p>Please add some authors to your database first.</p>
            </div>
        );
    }

    return (
        <AuthorPage
            author={author}
            blogs={blogs}
            showBio={true}
            showSocialLinks={true}
            showBlogExcerpts={true}
            blogsPerPage={10}
        />
    );
}