import React from 'react';
import type {HydratedBlog} from '@supergrowthai/next-blog-types/server';

interface BlogCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    blog: HydratedBlog;
    showImage?: boolean;
    showExcerpt?: boolean;
    showAuthor?: boolean;
    showDate?: boolean;
    showCategory?: boolean;
    showTags?: boolean;
    showReadMore?: boolean;
    style?: React.CSSProperties;
    imageStyle?: React.CSSProperties;
    contentStyle?: React.CSSProperties;
    titleStyle?: React.CSSProperties;
    excerptStyle?: React.CSSProperties;
    metaStyle?: React.CSSProperties;
    readMoreStyle?: React.CSSProperties;
}

export const BlogCard: React.FC<BlogCardProps> = ({
                                                      blog,
                                                      showImage = true,
                                                      showExcerpt = true,
                                                      showAuthor = true,
                                                      showDate = true,
                                                      showCategory = true,
                                                      showTags = false,
                                                      showReadMore = true,
                                                      style,
                                                      imageStyle,
                                                      contentStyle,
                                                      titleStyle,
                                                      excerptStyle,
                                                      metaStyle,
                                                      readMoreStyle,
                                                      className,
                                                      ...rest
                                                  }) => {
    const containerStyles: React.CSSProperties = {
        backgroundColor: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...style
    };

    const defaultImageStyles: React.CSSProperties = {
        width: '100%',
        height: '200px',
        objectFit: 'cover',
        backgroundColor: '#f3f4f6',
        ...imageStyle
    };

    const defaultContentStyles: React.CSSProperties = {
        padding: '20px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        ...contentStyle
    };

    const defaultTitleStyles: React.CSSProperties = {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '8px',
        textDecoration: 'none',
        display: 'block',
        lineHeight: 1.3,
        ...titleStyle
    };

    const defaultExcerptStyles: React.CSSProperties = {
        fontSize: '14px',
        color: '#4b5563',
        lineHeight: 1.6,
        marginBottom: '12px',
        flex: 1,
        ...excerptStyle
    };

    const defaultMetaStyles: React.CSSProperties = {
        fontSize: '12px',
        color: '#9ca3af',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center',
        marginBottom: showReadMore ? '12px' : '0',
        ...metaStyle
    };

    const defaultReadMoreStyles: React.CSSProperties = {
        fontSize: '14px',
        color: '#2563eb',
        fontWeight: '500',
        textDecoration: 'none',
        display: 'inline-block',
        ...readMoreStyle
    };

    const getExcerpt = (): string => {
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

    const formatDate = (timestamp: number): string => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const imageUrl = blog.featuredMedia?.url ||
        blog.metadata?.['json-ld-structured-data:overrides']?.featuredImageMedia?.url;

    return (
        <article
            style={containerStyles}
            className={className}
            {...rest}
        >
            {showImage && imageUrl && (
                <img src={imageUrl} alt={blog.title} style={defaultImageStyles}/>
            )}
            {showImage && !imageUrl && (
                <div style={{...defaultImageStyles, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <span style={{fontSize: '48px', color: '#d1d5db'}}>📄</span>
                </div>
            )}

            <div style={defaultContentStyles}>
                <a
                    href={blog.metadata?.['permalink-manager:permalink']?.permalink || `/${blog.slug}`}
                    style={defaultTitleStyles}
                >
                    {blog.title}
                </a>

                {showExcerpt && (
                    <p style={defaultExcerptStyles}>
                        {getExcerpt()}
                    </p>
                )}

                <div style={defaultMetaStyles}>
                    {showDate && <span>{formatDate(blog.createdAt)}</span>}
                    {showDate && showAuthor && <span>•</span>}
                    {showAuthor && <span>By {blog.user.name}</span>}
                    {(showDate || showAuthor) && showCategory && <span>•</span>}
                    {showCategory && blog.category && <span>{blog.category.name}</span>}
                    {showTags && blog.tags && blog.tags.length > 0 && (
                        <>
                            <span>•</span>
                            <span>
                {blog.tags.slice(0, 2).map(tag => `#${tag.name}`).join(', ')}
              </span>
                        </>
                    )}
                </div>

                {showReadMore && (
                    <a
                        href={blog.metadata?.['permalink-manager:permalink']?.permalink || `/${blog.slug}`}
                        style={defaultReadMoreStyles}


                    >
                        Read More →
                    </a>
                )}
            </div>
        </article>
    );
};