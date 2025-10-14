import React from 'react';
import type {DatabaseAdapter, DetailedBlog} from '@supergrowthai/next-blog';

interface HeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, 'style'> {
    db: DatabaseAdapter;
    blog: DetailedBlog;
    style?: React.CSSProperties;
    containerStyle?: React.CSSProperties;
    titleStyle?: React.CSSProperties;
    excerptStyle?: React.CSSProperties;
}

export const Header: React.FC<HeaderProps> = ({
                                                  db,
                                                  blog,
                                                  style,
                                                  containerStyle,
                                                  titleStyle,
                                                  excerptStyle,
                                                  ...rest
                                              }) => {
    const headerStyles: React.CSSProperties = {
        backgroundColor: 'white',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)',
        color: 'black',
        ...style,
    };

    const containerStyles: React.CSSProperties = {
        maxWidth: '72rem',
        margin: '0 auto',
        padding: '24px 16px',
        ...containerStyle,
    };

    const titleStyles: React.CSSProperties = {
        fontSize: '2.25rem',
        fontWeight: 'bold',
        color: '#111827',
        ...titleStyle,
    };

    const excerptStyles: React.CSSProperties = {
        marginTop: '8px',
        fontSize: '1.125rem',
        color: '#4B5563',
        ...excerptStyle,
    };

    return (
        <header style={headerStyles} {...rest}>
            <div style={containerStyles}>
                <h1 style={titleStyles}>{blog.title}</h1>
                <p style={excerptStyles}>{blog.excerpt}</p>
            </div>
        </header>
    );
};
