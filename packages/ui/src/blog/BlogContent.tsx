import React from 'react';
import type {HydratedBlog} from '@supergrowthai/next-blog-types/server';
import {contentObjectToHtml} from "@supergrowthai/plugin-dev-kit/content";

interface BlogContentProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    blog: HydratedBlog;
    style?: React.CSSProperties;
}

export const BlogContent: React.FC<BlogContentProps> = ({
                                                            blog,
                                                            style,
                                                            className,
                                                            ...rest
                                                        }) => {
    const htmlContent = contentObjectToHtml(blog.content);

    const defaultStyles: React.CSSProperties = {
        fontSize: '1rem',
        lineHeight: 1.7,
        color: '#374151',
        ...style
    };

    return (
        <div
            style={defaultStyles}
            className={className}
            dangerouslySetInnerHTML={{__html: htmlContent}}
            {...rest}
        />
    );
};