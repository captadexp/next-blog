import React from 'react';
import type {HydratedBlog} from '@supergrowthai/next-blog-types/server';
import {BlogCard} from './BlogCard';

interface BlogGridProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    blogs: HydratedBlog[];
    columns?: { sm?: number; md?: number; lg?: number };
    gap?: number;
    showImage?: boolean;
    showExcerpt?: boolean;
    showAuthor?: boolean;
    showDate?: boolean;
    showCategory?: boolean;
    showTags?: boolean;
    showReadMore?: boolean;
    style?: React.CSSProperties;
    cardStyle?: React.CSSProperties;
}

export const BlogGrid: React.FC<BlogGridProps> = ({
                                                      blogs,
                                                      columns = {sm: 1, md: 2, lg: 2},
                                                      gap = 24,
                                                      showImage = true,
                                                      showExcerpt = true,
                                                      showAuthor = true,
                                                      showDate = true,
                                                      showCategory = true,
                                                      showTags = false,
                                                      showReadMore = true,
                                                      style,
                                                      cardStyle,
                                                      className,
                                                      ...rest
                                                  }) => {
    const sm = columns.sm || 1;
    const md = columns.md || 2;
    const lg = columns.lg || 2;

    const gridClassName = `blog-grid-responsive-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                    .${gridClassName} {
                        display: grid;
                        grid-template-columns: repeat(${sm}, 1fr);
                        gap: ${gap}px;
                    }
                    @media (min-width: 768px) {
                        .${gridClassName} {
                            grid-template-columns: repeat(${md}, 1fr);
                        }
                    }
                    @media (min-width: 1024px) {
                        .${gridClassName} {
                            grid-template-columns: repeat(${lg}, 1fr);
                        }
                    }
                `
            }}/>
            <div
                className={`${gridClassName} ${className || ''}`}
                style={style}
                {...rest}
            >
                {blogs.map(blog => (
                    <BlogCard
                        key={blog._id}
                        blog={blog}
                        showImage={showImage}
                        showExcerpt={showExcerpt}
                        showAuthor={showAuthor}
                        showDate={showDate}
                        showCategory={showCategory}
                        showTags={showTags}
                        showReadMore={showReadMore}
                        style={cardStyle}
                    />
                ))}
            </div>
        </>
    );
};