import React from 'react';
import {DatabaseAdapter, DetailedBlog} from '@supergrowthai/next-blog/types';
import {contentObjectToHtml} from "@supergrowthai/plugin-dev-kit/content";

interface ContentProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    db: DatabaseAdapter;
    blog: DetailedBlog;
    style?: React.CSSProperties;
    contentStyle?: React.CSSProperties;
}


export const Content: React.FC<ContentProps> = ({db, blog, style, contentStyle, ...rest}) => {
    const containerStyles: React.CSSProperties = {
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        ...style,
    };

    const contentStyles: React.CSSProperties = {
        ...contentStyle,
    };

    // Always convert ContentObject to HTML for rendering
    const htmlContent = contentObjectToHtml(blog.content);

    return (
        <div style={containerStyles} {...rest}>
            <div style={contentStyles} dangerouslySetInnerHTML={{__html: htmlContent}}/>
        </div>
    );
};
