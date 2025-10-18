import React from 'react';
import type {Tag} from '@supergrowthai/next-blog-types/server';

interface TagListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    tags: Tag[];
    layout?: 'grid' | 'list' | 'inline';
    columns?: number;
    style?: React.CSSProperties;
    itemStyle?: React.CSSProperties;
    linkStyle?: React.CSSProperties;
}

export const TagList: React.FC<TagListProps> = ({
                                                    tags,
                                                    layout = 'grid',
                                                    columns = 3,
                                                    style,
                                                    itemStyle,
                                                    linkStyle,
                                                    className,
                                                    ...rest
                                                }) => {
    const getContainerStyles = (): React.CSSProperties => {
        const baseStyles: React.CSSProperties = {
            ...style
        };

        switch (layout) {
            case 'grid':
                return {
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gap: '16px',
                    ...baseStyles
                };
            case 'list':
                return {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    ...baseStyles
                };
            case 'inline':
                return {
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    ...baseStyles
                };
            default:
                return baseStyles;
        }
    };

    const defaultItemStyles: React.CSSProperties = {
        padding: layout === 'inline' ? '6px 12px' : '12px 16px',
        backgroundColor: '#f3f4f6',
        borderRadius: layout === 'inline' ? '9999px' : '8px',
        transition: 'background-color 0.2s',
        ...itemStyle
    };

    const defaultLinkStyles: React.CSSProperties = {
        color: '#374151',
        textDecoration: 'none',
        fontSize: layout === 'inline' ? '14px' : '16px',
        fontWeight: '500',
        display: 'block',
        ...linkStyle
    };

    return (
        <div style={getContainerStyles()} className={className} {...rest}>
            {tags.map(tag => (
                <div key={tag._id} style={defaultItemStyles}>
                    <a href={`/tag/${tag.slug}`} style={defaultLinkStyles}>
                        #{tag.name}
                    </a>
                </div>
            ))}
        </div>
    );
};