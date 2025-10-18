import React from 'react';
import type {Category, HydratedBlog} from '@supergrowthai/next-blog-types/server';

interface CategoryArticlesProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    category: Category;
    blogs: HydratedBlog[];
    showCategoryHeader?: boolean;
    style?: React.CSSProperties;
    headerStyle?: React.CSSProperties;
    articleStyle?: React.CSSProperties;
    titleStyle?: React.CSSProperties;
    excerptStyle?: React.CSSProperties;
    metaStyle?: React.CSSProperties;
}

export const CategoryArticles: React.FC<CategoryArticlesProps> = ({
                                                                      category,
                                                                      blogs,
                                                                      showCategoryHeader = true,
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
        paddingBottom: '16px',
        borderBottom: '2px solid #e5e7eb',
        ...headerStyle
    };

    const defaultArticleStyles: React.CSSProperties = {
        marginBottom: '32px',
        ...articleStyle
    };

    const defaultTitleStyles: React.CSSProperties = {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '12px',
        textDecoration: 'none',
        display: 'block',
        transition: 'color 0.2s',
        ...titleStyle
    };

    const defaultExcerptStyles: React.CSSProperties = {
        fontSize: '16px',
        color: '#4b5563',
        lineHeight: 1.7,
        marginBottom: '12px',
        ...excerptStyle
    };

    const defaultMetaStyles: React.CSSProperties = {
        fontSize: '14px',
        color: '#9ca3af',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center',
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
        return text.length > 200 ? `${text.substring(0, 200)}...` : text;
    };

    const formatDate = (timestamp: number): string => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div style={containerStyles} className={className} {...rest}>
            {showCategoryHeader && (
                <header style={defaultHeaderStyles}>
                    <h1 style={{fontSize: '36px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px'}}>
                        {category.name}
                    </h1>
                    {category.description && (
                        <p style={{fontSize: '18px', color: '#6b7280', marginBottom: '8px'}}>
                            {category.description}
                        </p>
                    )}
                    <p style={{fontSize: '14px', color: '#9ca3af'}}>
                        {blogs.length} {blogs.length === 1 ? 'article' : 'articles'} in this category
                    </p>
                </header>
            )}

            <div>
                {blogs.map(blog => (
                    <article key={blog._id} style={defaultArticleStyles}>
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
                            <span>•</span>
                            <span>By {blog.user.name}</span>
                            {blog.tags && blog.tags.length > 0 && (
                                <>
                                    <span>•</span>
                                    <span>
                    {blog.tags.map((tag, idx) => (
                        <React.Fragment key={tag._id}>
                            <a
                                href={`/tag/${tag.slug}`}
                                style={{color: '#2563eb', textDecoration: 'none'}}
                            >
                                #{tag.name}
                            </a>
                            {idx < blog.tags.length - 1 && ', '}
                        </React.Fragment>
                    ))}
                  </span>
                                </>
                            )}
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
};