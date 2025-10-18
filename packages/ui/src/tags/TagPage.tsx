import React from 'react';
import type {HydratedBlog, Tag} from '@supergrowthai/next-blog-types/server';
import {TagArticles} from './TagArticles';

interface TagPageProps {
    tag: Tag;
    blogs: HydratedBlog[];
    showBlogExcerpts?: boolean;
    blogsPerPage?: number;
    layout?: 'list' | 'grid';
}

export const TagPage: React.FC<TagPageProps> = ({
                                                    tag,
                                                    blogs,
                                                    showBlogExcerpts = true,
                                                    blogsPerPage = 10,
                                                    layout = 'list'
                                                }) => {
    const displayBlogs = blogs.slice(0, blogsPerPage);

    return (
        <div style={{maxWidth: '1200px', margin: '0 auto', padding: '40px 20px'}}>
            <div style={{marginBottom: '40px'}}>
                <h1 style={{fontSize: '2.5rem', marginBottom: '16px'}}>
                    <span style={{color: '#6b7280'}}>#</span>{tag.name}
                </h1>
                {tag.description && (
                    <p style={{fontSize: '1.125rem', color: '#6b7280'}}>{tag.description}</p>
                )}
            </div>

            <TagArticles
                tag={tag}
                blogs={displayBlogs}
                showTagHeader={false}
            />
        </div>
    );
};