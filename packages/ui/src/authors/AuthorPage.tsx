import React from 'react';
import type {HydratedBlog, User} from '@supergrowthai/next-blog-types/server';
import {AuthorBio} from './AuthorBio';
import {AuthorArticles} from './AuthorArticles';

interface AuthorPageProps {
    author: User;
    blogs: HydratedBlog[];
    showBio?: boolean;
    showSocialLinks?: boolean;
    showBlogExcerpts?: boolean;
    blogsPerPage?: number;
    layout?: 'list' | 'grid';
}

export const AuthorPage: React.FC<AuthorPageProps> = ({
                                                          author,
                                                          blogs,
                                                          showBio = true,
                                                          showSocialLinks = true,
                                                          showBlogExcerpts = true,
                                                          blogsPerPage = 10,
                                                          layout = 'list'
                                                      }) => {
    const displayBlogs = blogs.slice(0, blogsPerPage);

    return (
        <div style={{maxWidth: '1200px', margin: '0 auto', padding: '40px 20px'}}>
            {showBio && (
                <AuthorBio
                    author={author}
                    showSocialLinks={showSocialLinks}
                    style={{marginBottom: '40px'}}
                />
            )}

            <AuthorArticles
                author={author}
                blogs={displayBlogs}
                showAuthorHeader={false}
                layout={layout}
            />
        </div>
    );
};