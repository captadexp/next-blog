import React from 'react';
import type {HydratedBlog} from '@supergrowthai/next-blog-types/server';

interface RelatedPostsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    blogs: HydratedBlog[];
    currentBlogId?: string;
    title?: string;
    showCategory?: boolean;
    showTags?: boolean;
    limit?: number;
    style?: React.CSSProperties;
    titleStyle?: React.CSSProperties;
    listStyle?: React.CSSProperties;
    listItemStyle?: React.CSSProperties;
    linkStyle?: React.CSSProperties;
    metaStyle?: React.CSSProperties;
}

export const RelatedPosts: React.FC<RelatedPostsProps> = ({
                                                              blogs,
                                                              currentBlogId,
                                                              title = 'Related Posts',
                                                              showCategory = false,
                                                              showTags = true,
                                                              limit = 5,
                                                              style,
                                                              titleStyle,
                                                              listStyle,
                                                              listItemStyle,
                                                              linkStyle,
                                                              metaStyle,
                                                              className,
                                                              ...rest
                                                          }) => {
    // Filter out current blog if provided
    const relatedBlogs = blogs
        .filter(blog => blog._id !== currentBlogId)
        .slice(0, limit);

    const containerStyles: React.CSSProperties = {
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        ...style,
    };

    const defaultTitleStyles: React.CSSProperties = {
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '16px',
        color: '#1f2937',
        ...titleStyle,
    };

    const defaultListStyles: React.CSSProperties = {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        ...listStyle,
    };

    const defaultListItemStyles: React.CSSProperties = {
        marginBottom: '14px',
        paddingBottom: '14px',
        borderBottom: '1px solid #f3f4f6',
        ...listItemStyle,
    };

    const defaultLinkStyles: React.CSSProperties = {
        color: '#2563eb',
        textDecoration: 'none',
        fontSize: '15px',
        fontWeight: '500',
        display: 'block',
        marginBottom: '4px',
        transition: 'color 0.2s',
        ...linkStyle,
    };

    const defaultMetaStyles: React.CSSProperties = {
        fontSize: '12px',
        color: '#9ca3af',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        ...metaStyle
    };

    if (relatedBlogs.length === 0) {
        return null;
    }

    return (
        <div style={containerStyles} className={className} {...rest}>
            <h3 style={defaultTitleStyles}>{title}</h3>
            <ul style={defaultListStyles}>
                {relatedBlogs.map((blog, index) => (
                    <li
                        key={blog._id}
                        style={{
                            ...defaultListItemStyles,
                            borderBottom: index === relatedBlogs.length - 1 ? 'none' : defaultListItemStyles.borderBottom
                        }}
                    >
                        <a
                            href={`/${blog.slug}`}
                            style={defaultLinkStyles}


                        >
                            {blog.title}
                        </a>
                        <div style={defaultMetaStyles}>
                            {showCategory && blog.category && (
                                <span>{blog.category.name}</span>
                            )}
                            {showCategory && showTags && blog.tags && blog.tags.length > 0 && (
                                <span>•</span>
                            )}
                            {showTags && blog.tags && blog.tags.length > 0 && (
                                <span>
                                    {blog.tags.slice(0, 2).map(tag => `#${tag.name}`).join(', ')}
                                    {blog.tags.length > 2 && '...'}
                                </span>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};
