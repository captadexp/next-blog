import React from 'react';
import type {HydratedBlog, Tag} from '@supergrowthai/next-blog-types/server';

interface TagArticlesProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    tag: Tag;
    blogs: HydratedBlog[];
    showTagHeader?: boolean;
    style?: React.CSSProperties;
    headerStyle?: React.CSSProperties;
    articleStyle?: React.CSSProperties;
    titleStyle?: React.CSSProperties;
    excerptStyle?: React.CSSProperties;
}

export const TagArticles: React.FC<TagArticlesProps> = ({
                                                            tag,
                                                            blogs,
                                                            showTagHeader = true,
                                                            style,
                                                            headerStyle,
                                                            articleStyle,
                                                            titleStyle,
                                                            excerptStyle,
                                                            className,
                                                            ...rest
                                                        }) => {
    const containerStyles: React.CSSProperties = {
        ...style
    };

    const defaultHeaderStyles: React.CSSProperties = {
        marginBottom: '32px',
        ...headerStyle
    };

    const defaultArticleStyles: React.CSSProperties = {
        marginBottom: '24px',
        paddingBottom: '24px',
        borderBottom: '1px solid #e5e7eb',
        ...articleStyle
    };

    const defaultTitleStyles: React.CSSProperties = {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '8px',
        textDecoration: 'none',
        display: 'block',
        ...titleStyle
    };

    const defaultExcerptStyles: React.CSSProperties = {
        fontSize: '14px',
        color: '#6b7280',
        lineHeight: 1.6,
        ...excerptStyle
    };

    const getExcerpt = (blog: HydratedBlog): string => {
        if (blog.excerpt) return blog.excerpt;

        const extractText = (content: any): string => {
            if (!content) return '';
            if (typeof content === 'string') return content;
            if (Array.isArray(content)) {
                return content.map(item => extractText(item)).join(' ');
            }
            if (typeof content === 'object' && 'children' in content) {
                return extractText(content.children);
            }
            return '';
        };

        const text = extractText(blog.content).trim();
        return text.length > 150 ? `${text.substring(0, 150)}...` : text;
    };

    return (
        <div style={containerStyles} className={className} {...rest}>
            {showTagHeader && (
                <div style={defaultHeaderStyles}>
                    <h1 style={{fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px'}}>
                        Tag: {tag.name}
                    </h1>
                    <p style={{fontSize: '16px', color: '#6b7280'}}>
                        {blogs.length} {blogs.length === 1 ? 'article' : 'articles'} tagged with "{tag.name}"
                    </p>
                </div>
            )}

            <div>
                {blogs.map((blog, index) => (
                    <article
                        key={blog._id}
                        style={{
                            ...defaultArticleStyles,
                            borderBottom: index === blogs.length - 1 ? 'none' : defaultArticleStyles.borderBottom
                        }}
                    >
                        {blog.metadata?.['permalink-manager:permalink']?.permalink ? (
                            <a href={blog.metadata['permalink-manager:permalink'].permalink} style={defaultTitleStyles}>
                                {blog.title}
                            </a>
                        ) : (
                            <span style={defaultTitleStyles}>
                                {blog.title}
                            </span>
                        )}
                        <p style={defaultExcerptStyles}>
                            {getExcerpt(blog)}
                        </p>
                        <div style={{marginTop: '8px', fontSize: '12px', color: '#9ca3af'}}>
                            {new Date(blog.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                            {' • '}
                            {blog.user.metadata?.['permalink-manager:permalink']?.permalink ? (
                                <a
                                    href={blog.user.metadata['permalink-manager:permalink'].permalink}
                                    style={{color: '#2563eb', textDecoration: 'none'}}
                                >
                                    {blog.user.name}
                                </a>
                            ) : (
                                blog.user.name
                            )}
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
};