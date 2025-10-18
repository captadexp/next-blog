import React from 'react';
import type {HydratedBlog} from '@supergrowthai/next-blog-types/server';

interface BlogTitleProps extends Omit<React.HTMLAttributes<HTMLHeadingElement>, 'style'> {
    blog: HydratedBlog;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    style?: React.CSSProperties;
}

export const BlogTitle: React.FC<BlogTitleProps> = ({
                                                        blog,
                                                        level = 1,
                                                        style,
                                                        className,
                                                        ...rest
                                                    }) => {
    const defaultStyles: React.CSSProperties = {
        fontSize: level === 1 ? '2.5rem' : level === 2 ? '2rem' : '1.5rem',
        fontWeight: 'bold',
        lineHeight: 1.2,
        marginBottom: '1rem',
        color: '#1a202c',
        ...style
    };

    const HeadingTag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

    return React.createElement(
        HeadingTag,
        {style: defaultStyles, className, ...rest},
        blog.title
    );
};