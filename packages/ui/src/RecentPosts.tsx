import React from 'react';
import type {HydratedBlog} from '@supergrowthai/next-blog-types/server';

interface RecentPostsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    blogs: HydratedBlog[];
    title?: string;
    showDate?: boolean;
    showAuthor?: boolean;
    limit?: number;
    style?: React.CSSProperties;
    titleStyle?: React.CSSProperties;
    listStyle?: React.CSSProperties;
    listItemStyle?: React.CSSProperties;
    linkStyle?: React.CSSProperties;
    metaStyle?: React.CSSProperties;
}

export const RecentPosts: React.FC<RecentPostsProps> = ({
                                                            blogs,
                                                            title = 'Recent Posts',
                                                            showDate = true,
                                                            showAuthor = false,
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
    const recentBlogs = blogs.slice(0, limit);

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
        ...listStyle
    };

    const defaultListItemStyles: React.CSSProperties = {
        marginBottom: '12px',
        paddingBottom: '12px',
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
        ...metaStyle
    };

    const formatDate = (timestamp: number): string => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div style={containerStyles} className={className} {...rest}>
            <h3 style={defaultTitleStyles}>{title}</h3>
            <ul style={defaultListStyles}>
                {recentBlogs.map((blog, index) => (
                    <li
                        key={blog._id}
                        style={{
                            ...defaultListItemStyles,
                            borderBottom: index === recentBlogs.length - 1 ? 'none' : defaultListItemStyles.borderBottom
                        }}
                    >
                        <a
                            href={`/${blog.slug}`}
                            style={defaultLinkStyles}


                        >
                            {blog.title}
                        </a>
                        <div style={defaultMetaStyles}>
                            {showDate && formatDate(blog.createdAt)}
                            {showDate && showAuthor && ' • '}
                            {showAuthor && blog.user.name}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};
