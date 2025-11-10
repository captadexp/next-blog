import React from 'react';
import type {HydratedBlog} from '@supergrowthai/next-blog-types/server';
import {contentObjectToHtml} from "@supergrowthai/plugin-dev-kit/content";
import styles from './BlogContent.module.css';

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

    return (
        <div
            style={style}
            className={`${styles.blogContent} ${className || ''}`}
            dangerouslySetInnerHTML={{__html: htmlContent}}
            {...rest}
        />
    );
};