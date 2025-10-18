import React from 'react';
import type {HydratedBlog} from '@supergrowthai/next-blog-types/server';

interface BlogMetaProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    blog: HydratedBlog;
    showDate?: boolean;
    showCategory?: boolean;
    showTags?: boolean;
    showReadTime?: boolean;
    dateFormat?: 'short' | 'long' | 'relative';
    style?: React.CSSProperties;
    itemStyle?: React.CSSProperties;
    separatorStyle?: React.CSSProperties;
}

export const BlogMeta: React.FC<BlogMetaProps> = ({
                                                      blog,
                                                      showDate = true,
                                                      showCategory = true,
                                                      showTags = true,
                                                      showReadTime = false,
                                                      dateFormat = 'long',
                                                      style,
                                                      itemStyle,
                                                      separatorStyle,
                                                      className,
                                                      ...rest
                                                  }) => {
    const formatDate = (timestamp: number): string => {
        const date = new Date(timestamp);

        switch (dateFormat) {
            case 'short':
                return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
            case 'long':
                return date.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
            case 'relative':
                const now = Date.now();
                const diff = now - timestamp;
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                if (days === 0) return 'Today';
                if (days === 1) return 'Yesterday';
                if (days < 7) return `${days} days ago`;
                if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
                if (days < 365) return `${Math.floor(days / 30)} months ago`;
                return `${Math.floor(days / 365)} years ago`;
            default:
                return date.toLocaleDateString();
        }
    };

    const estimateReadTime = (content: any): number => {
        const text = JSON.stringify(content);
        const wordsPerMinute = 200;
        const words = text.split(/\s+/).length;
        return Math.ceil(words / wordsPerMinute);
    };

    const containerStyles: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: '#6b7280',
        ...style
    };

    const defaultItemStyles: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        ...itemStyle
    };

    const defaultSeparatorStyles: React.CSSProperties = {
        margin: '0 4px',
        color: '#d1d5db',
        ...separatorStyle
    };

    const Separator = () => <span style={defaultSeparatorStyles}>•</span>;

    const metaItems = [];

    if (showDate) {
        metaItems.push(
            <span key="date" style={defaultItemStyles}>
        {formatDate(blog.createdAt)}
      </span>
        );
    }

    if (showCategory && blog.category) {
        metaItems.push(
            <a
                key="category"
                href={`/category/${blog.category.slug}`}
                style={{...defaultItemStyles, color: '#2563eb', textDecoration: 'none'}}
            >
                {blog.category.name}
            </a>
        );
    }

    if (showTags && blog.tags && blog.tags.length > 0) {
        metaItems.push(
            <div key="tags" style={defaultItemStyles}>
                {blog.tags.map((tag, index) => (
                    <React.Fragment key={tag._id}>
                        <a
                            href={`/tag/${tag.slug}`}
                            style={{color: '#2563eb', textDecoration: 'none'}}
                        >
                            #{tag.name}
                        </a>
                        {index < blog.tags.length - 1 && ', '}
                    </React.Fragment>
                ))}
            </div>
        );
    }

    if (showReadTime) {
        metaItems.push(
            <span key="readtime" style={defaultItemStyles}>
        {estimateReadTime(blog.content)} min read
      </span>
        );
    }

    return (
        <div style={containerStyles} className={className} {...rest}>
            {metaItems.map((item, index) => (
                <React.Fragment key={index}>
                    {item}
                    {index < metaItems.length - 1 && <Separator/>}
                </React.Fragment>
            ))}
        </div>
    );
};