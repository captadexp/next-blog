import React from 'react';
import type {HydratedBlog} from '@supergrowthai/next-blog-types/server';
import {BlogCard} from './BlogCard';

interface BlogGridProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    blogs: HydratedBlog[];
    columns?: number | { sm?: number; md?: number; lg?: number };
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
                                                      columns = 3,
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
    const getGridColumns = (): string => {
        if (typeof columns === 'number') {
            return `repeat(${columns}, 1fr)`;
        }
        // For responsive columns, use the largest defined value
        const cols = columns.lg || columns.md || columns.sm || 1;
        return `repeat(auto-fill, minmax(${Math.floor(100 / cols) - 2}%, 1fr))`;
    };

    const containerStyles: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: getGridColumns(),
        gap: `${gap}px`,
        ...style
    };

    return (
        <div style={containerStyles} className={className} {...rest}>
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
    );
};