import React from 'react';
import type {HydratedBlog} from '@supergrowthai/next-blog-types/server';
import {FeaturedMedia} from './FeaturedMedia';
import {BlogTitle} from './BlogTitle';
import {BlogMeta} from './BlogMeta';
import {BlogContent} from './BlogContent';

interface BlogPostProps extends Omit<React.HTMLAttributes<HTMLElement>, 'style'> {
    blog: HydratedBlog;
    showFeaturedMedia?: boolean;
    showTitle?: boolean;
    showMeta?: boolean;
    style?: React.CSSProperties;
    featuredMediaStyle?: React.CSSProperties;
    titleStyle?: React.CSSProperties;
    metaStyle?: React.CSSProperties;
    contentStyle?: React.CSSProperties;
}

export const BlogPost: React.FC<BlogPostProps> = ({
                                                      blog,
                                                      showFeaturedMedia = true,
                                                      showTitle = true,
                                                      showMeta = true,
                                                      style,
                                                      featuredMediaStyle,
                                                      titleStyle,
                                                      metaStyle,
                                                      contentStyle,
                                                      className,
                                                      ...rest
                                                  }) => {
    const containerStyles: React.CSSProperties = {
        maxWidth: '100%',
        ...style
    };

    return (
        <article
            style={containerStyles}
            className={className}
            {...rest}
        >
            {showFeaturedMedia && (
                <FeaturedMedia
                    blog={blog}
                    style={featuredMediaStyle}
                />
            )}

            {showTitle && (
                <BlogTitle
                    blog={blog}
                    style={titleStyle}
                />
            )}

            {showMeta && (
                <BlogMeta
                    blog={blog}
                    style={metaStyle}
                />
            )}

            <BlogContent
                blog={blog}
                style={contentStyle}
            />
        </article>
    );
};