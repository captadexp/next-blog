import React from 'react';
import type {HydratedBlog} from '@supergrowthai/next-blog-types/server';
import {BlogGrid} from './BlogGrid';

interface RelatedBlogsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    blogs: HydratedBlog[];
    currentBlogId?: string;
    title?: string;
    layout?: 'grid' | 'list' | 'cards';
    columns?: number;
    limit?: number;
    showImage?: boolean;
    showExcerpt?: boolean;
    showAuthor?: boolean;
    style?: React.CSSProperties;
    titleStyle?: React.CSSProperties;
    blogsContainerStyle?: React.CSSProperties;
}

export const RelatedBlogs: React.FC<RelatedBlogsProps> = ({
                                                              blogs,
                                                              currentBlogId,
                                                              title = 'Related Articles',
                                                              layout = 'cards',
                                                              columns = 2,
                                                              limit = 4,
                                                              showImage = true,
                                                              showExcerpt = true,
                                                              showAuthor = false,
                                                              style,
                                                              titleStyle,
                                                              blogsContainerStyle,
                                                              className,
                                                              ...rest
                                                          }) => {
    const relatedBlogs = blogs
        .filter(blog => blog._id !== currentBlogId)
        .slice(0, limit);

    if (relatedBlogs.length === 0) {
        return null;
    }

    const containerStyles: React.CSSProperties = {
        marginTop: '40px',
        ...style
    };

    const defaultTitleStyles: React.CSSProperties = {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '20px',
        ...titleStyle
    };

    if (layout === 'list') {
        return (
            <div style={containerStyles} className={className} {...rest}>
                {title && <h3 style={defaultTitleStyles}>{title}</h3>}
                <div style={blogsContainerStyle}>
                    {relatedBlogs.map(blog => (
                        <div key={blog._id} style={{marginBottom: '16px'}}>
                            {blog.metadata?.['permalink-manager:permalink']?.permalink ? (
                                <a
                                    href={blog.metadata['permalink-manager:permalink'].permalink}
                                    style={{
                                        fontSize: '16px',
                                        color: '#2563eb',
                                        textDecoration: 'none',
                                        fontWeight: '500'
                                    }}
                                >
                                    {blog.title}
                                </a>
                            ) : (
                                <span
                                    style={{
                                        fontSize: '16px',
                                        color: '#6b7280',
                                        fontWeight: '500'
                                    }}
                                >
                                    {blog.title}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (layout === 'cards') {
        return (
            <div style={containerStyles} className={className} {...rest}>
                {title && <h3 style={defaultTitleStyles}>{title}</h3>}
                <BlogGrid
                    blogs={relatedBlogs}
                    columns={columns}
                    showImage={showImage}
                    showExcerpt={showExcerpt}
                    showAuthor={showAuthor}
                    showDate={false}
                    showCategory={false}
                    showReadMore={false}
                    style={blogsContainerStyle}
                />
            </div>
        );
    }

    // Grid layout (default)
    return (
        <div style={containerStyles} className={className} {...rest}>
            {title && <h3 style={defaultTitleStyles}>{title}</h3>}
            <BlogGrid
                blogs={relatedBlogs}
                columns={columns}
                showImage={showImage}
                showExcerpt={showExcerpt}
                showAuthor={showAuthor}
                style={blogsContainerStyle}
            />
        </div>
    );
};