import React from 'react';
import type {HydratedBlog} from '@supergrowthai/next-blog-types/server';

interface BlogExcerptProps extends Omit<React.HTMLAttributes<HTMLParagraphElement>, 'style'> {
    blog: HydratedBlog;
    maxLength?: number;
    showEllipsis?: boolean;
    style?: React.CSSProperties;
}

export const BlogExcerpt: React.FC<BlogExcerptProps> = ({
                                                            blog,
                                                            maxLength = 200,
                                                            showEllipsis = true,
                                                            style,
                                                            className,
                                                            ...rest
                                                        }) => {
    const getExcerpt = (): string => {
        if (blog.excerpt) {
            return blog.excerpt;
        }

        // Extract text from content object
        const extractText = (content: any): string => {
            if (!content) return '';
            if (typeof content === 'string') return content;
            if (Array.isArray(content)) {
                return content.map(item => extractText(item)).join(' ');
            }
            if (typeof content === 'object' && 'children' in content) {
                return extractText(content.children);
            }
            return '';
        };

        const text = extractText(blog.content).trim();

        if (text.length <= maxLength) {
            return text;
        }

        const truncated = text.substring(0, maxLength).trim();
        const lastSpace = truncated.lastIndexOf(' ');
        const finalText = lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;

        return showEllipsis ? `${finalText}...` : finalText;
    };

    const defaultStyles: React.CSSProperties = {
        fontSize: '16px',
        lineHeight: 1.6,
        color: '#4b5563',
        marginBottom: '1rem',
        ...style
    };

    return (
        <p style={defaultStyles} className={className} {...rest}>
            {getExcerpt()}
        </p>
    );
};