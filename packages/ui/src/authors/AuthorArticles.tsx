import React from 'react';
import type {HydratedBlog, User} from '@supergrowthai/next-blog-types/server';

interface AuthorArticlesProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    author: User;
    blogs: HydratedBlog[];
    showAuthorHeader?: boolean;
    layout?: 'list' | 'grid';
    style?: React.CSSProperties;
    headerStyle?: React.CSSProperties;
    articleStyle?: React.CSSProperties;
    titleStyle?: React.CSSProperties;
    excerptStyle?: React.CSSProperties;
    metaStyle?: React.CSSProperties;
}

export const AuthorArticles: React.FC<AuthorArticlesProps> = ({
                                                                  author,
                                                                  blogs,
                                                                  showAuthorHeader = true,
                                                                  layout = 'list',
                                                                  style,
                                                                  headerStyle,
                                                                  articleStyle,
                                                                  titleStyle,
                                                                  excerptStyle,
                                                                  metaStyle,
                                                                  className,
                                                                  ...rest
                                                              }) => {
    const containerStyles: React.CSSProperties = {
        ...style
    };

    const defaultHeaderStyles: React.CSSProperties = {
        marginBottom: '32px',
        paddingBottom: '20px',
        borderBottom: '2px solid #e5e7eb',
        ...headerStyle
    };

    const getArticleContainerStyles = (): React.CSSProperties => {
        if (layout === 'grid') {
            return {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '24px'
            };
        }
        return {};
    };

    const getArticleStyles = (): React.CSSProperties => {
        const baseStyles: React.CSSProperties = {
            ...articleStyle
        };

        if (layout === 'grid') {
            return {
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                ...baseStyles
            };
        }

        return {
            marginBottom: '28px',
            paddingBottom: '28px',
            borderBottom: '1px solid #e5e7eb',
            ...baseStyles
        };
    };

    const defaultTitleStyles: React.CSSProperties = {
        fontSize: layout === 'grid' ? '18px' : '22px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '8px',
        textDecoration: 'none',
        display: 'block',
        lineHeight: 1.3,
        transition: 'color 0.2s',
        ...titleStyle
    };

    const defaultExcerptStyles: React.CSSProperties = {
        fontSize: layout === 'grid' ? '14px' : '15px',
        color: '#4b5563',
        lineHeight: 1.6,
        marginBottom: '8px',
        ...excerptStyle
    };

    const defaultMetaStyles: React.CSSProperties = {
        fontSize: layout === 'grid' ? '12px' : '13px',
        color: '#9ca3af',
        ...metaStyle
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
        const maxLength = layout === 'grid' ? 120 : 180;
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
    };

    const formatDate = (timestamp: number): string => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div style={containerStyles} className={className} {...rest}>
            {showAuthorHeader && (
                <header style={defaultHeaderStyles}>
                    <h1 style={{fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px'}}>
                        Articles by {author.name}
                    </h1>
                    {author.bio && (
                        <p style={{fontSize: '16px', color: '#6b7280', marginBottom: '8px', maxWidth: '600px'}}>
                            {author.bio}
                        </p>
                    )}
                    <p style={{fontSize: '14px', color: '#9ca3af'}}>
                        {blogs.length} {blogs.length === 1 ? 'article' : 'articles'} published
                    </p>
                </header>
            )}

            <div style={getArticleContainerStyles()}>
                {blogs.map((blog, index) => (
                    <article
                        key={blog._id}
                        style={{
                            ...getArticleStyles(),
                            ...(layout === 'list' && index === blogs.length - 1 ? {borderBottom: 'none'} : {})
                        }}
                    >
                        <a
                            href={`/${blog.slug}`}
                            style={defaultTitleStyles}


                        >
                            {blog.title}
                        </a>

                        <p style={defaultExcerptStyles}>
                            {getExcerpt(blog)}
                        </p>

                        <div style={defaultMetaStyles}>
                            <span>{formatDate(blog.createdAt)}</span>
                            {blog.category && (
                                <>
                                    <span> • </span>
                                    <a
                                        href={`/category/${blog.category.slug}`}
                                        style={{color: 'inherit', textDecoration: 'none'}}
                                    >
                                        {blog.category.name}
                                    </a>
                                </>
                            )}
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
};