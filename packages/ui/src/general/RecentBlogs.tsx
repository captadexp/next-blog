import React from 'react';
import type {HydratedBlog} from '@supergrowthai/next-blog-types/server';
import {BlogGrid} from './BlogGrid';
import {PermalinkText, PermalinkWrapper} from '../components/PermalinkWrapper';

interface RecentBlogsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    blogs: HydratedBlog[];
    title?: string;
    layout?: 'grid' | 'list';
    columns?: number;
    limit?: number;
    showImage?: boolean;
    showExcerpt?: boolean;
    showAuthor?: boolean;
    showDate?: boolean;
    showCategory?: boolean;
    style?: React.CSSProperties;
    titleStyle?: React.CSSProperties;
    blogsContainerStyle?: React.CSSProperties;
}

export const RecentBlogs: React.FC<RecentBlogsProps> = ({
                                                            blogs,
                                                            title = 'Recent Posts',
                                                            layout = 'grid',
                                                            columns = 3,
                                                            limit = 6,
                                                            showImage = true,
                                                            showExcerpt = true,
                                                            showAuthor = true,
                                                            showDate = true,
                                                            showCategory = true,
                                                            style,
                                                            titleStyle,
                                                            blogsContainerStyle,
                                                            className,
                                                            ...rest
                                                        }) => {
    const recentBlogs = blogs
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);

    const containerStyles: React.CSSProperties = {
        ...style
    };

    const defaultTitleStyles: React.CSSProperties = {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '24px',
        textAlign: 'center',
        ...titleStyle
    };

    const defaultBlogsContainerStyles: React.CSSProperties = {
        ...blogsContainerStyle
    };

    if (layout === 'list') {
        const listItemStyles: React.CSSProperties = {
            marginBottom: '24px',
            paddingBottom: '24px',
            borderBottom: '1px solid #e5e7eb'
        };

        return (
            <div style={containerStyles} className={className} {...rest}>
                {title && <h2 style={defaultTitleStyles}>{title}</h2>}
                <div style={defaultBlogsContainerStyles}>
                    {recentBlogs.map((blog, index) => (
                        <PermalinkWrapper
                            key={blog._id}
                            entity={blog}
                            fallbackElement="article"
                            style={{
                                ...listItemStyles,
                                borderBottom: index === recentBlogs.length - 1 ? 'none' : listItemStyles.borderBottom
                            }}
                        >
                            <h3
                                style={{
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: '#1f2937',
                                    display: 'block',
                                    marginBottom: '8px'
                                }}
                            >
                                {blog.title}
                            </h3>
                            {showExcerpt && blog.excerpt && (
                                <p style={{
                                    fontSize: '16px',
                                    color: '#4b5563',
                                    lineHeight: 1.6,
                                    marginBottom: '8px'
                                }}>
                                    {blog.excerpt}
                                </p>
                            )}
                            <div style={{
                                fontSize: '14px',
                                color: '#9ca3af',
                                display: 'flex',
                                gap: '12px',
                                flexWrap: 'wrap'
                            }}>
                                {showDate && (
                                    <span>
                    {new Date(blog.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                  </span>
                                )}
                                {showAuthor && (
                                    <PermalinkText entity={blog.user}>
                                        By {blog.user.name}
                                    </PermalinkText>
                                )}
                                {showCategory && blog.category &&
                                    <PermalinkText entity={blog.category}>{blog.category.name}</PermalinkText>}
                            </div>
                        </PermalinkWrapper>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={containerStyles} className={className} {...rest}>
            {title && <h2 style={defaultTitleStyles}>{title}</h2>}
            <BlogGrid
                blogs={recentBlogs}
                columns={columns}
                showImage={showImage}
                showExcerpt={showExcerpt}
                showAuthor={showAuthor}
                showDate={showDate}
                showCategory={showCategory}
                style={defaultBlogsContainerStyles}
            />
        </div>
    );
};