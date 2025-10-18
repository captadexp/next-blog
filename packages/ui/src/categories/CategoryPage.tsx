import React from 'react';
import type {Category, HydratedBlog} from '@supergrowthai/next-blog-types/server';
import {CategoryArticles} from './CategoryArticles';

interface CategoryPageProps {
    category: Category;
    blogs: HydratedBlog[];
    showDescription?: boolean;
    showBlogExcerpts?: boolean;
    blogsPerPage?: number;
    layout?: 'list' | 'grid';
}

export const CategoryPage: React.FC<CategoryPageProps> = ({
                                                              category,
                                                              blogs,
                                                              showDescription = true,
                                                              showBlogExcerpts = true,
                                                              blogsPerPage = 10,
                                                              layout = 'list'
                                                          }) => {
    const displayBlogs = blogs.slice(0, blogsPerPage);

    return (
        <div style={{maxWidth: '1200px', margin: '0 auto', padding: '40px 20px'}}>
            <div style={{marginBottom: '40px'}}>
                <h1 style={{fontSize: '2.5rem', marginBottom: '16px'}}>{category.name}</h1>
                {showDescription && category.description && (
                    <p style={{fontSize: '1.125rem', color: '#6b7280'}}>{category.description}</p>
                )}
            </div>

            <CategoryArticles
                category={category}
                blogs={displayBlogs}
                showCategoryHeader={false}
            />
        </div>
    );
};