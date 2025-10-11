import React from 'react';
import {DatabaseAdapter, DetailedBlog} from '@supergrowthai/next-blog/types';

interface RelatedPostsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    db: DatabaseAdapter;
    blog: DetailedBlog;
    style?: React.CSSProperties;
    titleStyle?: React.CSSProperties;
    listStyle?: React.CSSProperties;
    listItemStyle?: React.CSSProperties;
    linkStyle?: React.CSSProperties;
}

export const RelatedPosts: React.FC<RelatedPostsProps> = ({
                                                              db,
                                                              style,
                                                              titleStyle,
                                                              listStyle,
                                                              listItemStyle,
                                                              linkStyle,
                                                              ...rest
                                                          }) => {
    // In a real app, you'd fetch related posts from the db based on the current blog
    const containerStyles: React.CSSProperties = {
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        ...style,
    };

    const titleStyles: React.CSSProperties = {
        fontSize: '1.25rem',
        fontWeight: 'bold',
        marginBottom: '16px',
        ...titleStyle,
    };

    const listStyles: React.CSSProperties = {
        ...listStyle
    }

    const listItemStyles: React.CSSProperties = {
        marginBottom: '8px',
        ...listItemStyle,
    };

    const linkStyles: React.CSSProperties = {
        color: '#2563EB',
        textDecoration: 'none',
        ...linkStyle,
    };

    // Note: The hover:underline style cannot be replicated with inline styles without using state.
    // You can add this behavior with onMouseEnter and onMouseLeave events if needed.

    return (
        <div style={containerStyles} {...rest}>
            <h3 style={titleStyles}>Related Posts</h3>
            <ul style={listStyles}>
                {/* Placeholder content */}
                <li style={listItemStyles}><a href="#" style={linkStyles}>Related Post 1</a></li>
                <li style={listItemStyles}><a href="#" style={linkStyles}>Related Post 2</a></li>
            </ul>
        </div>
    );
};
