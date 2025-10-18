import React from 'react';
import type {Tag} from '@supergrowthai/next-blog-types/server';

interface TagWithCount extends Tag {
    count: number;
}

interface TagCloudProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    tags: TagWithCount[];
    minFontSize?: number;
    maxFontSize?: number;
    style?: React.CSSProperties;
    tagStyle?: React.CSSProperties;
}

export const TagCloud: React.FC<TagCloudProps> = ({
                                                      tags,
                                                      minFontSize = 14,
                                                      maxFontSize = 32,
                                                      style,
                                                      tagStyle,
                                                      className,
                                                      ...rest
                                                  }) => {
    const getTagSize = (count: number): number => {
        if (tags.length === 0) return minFontSize;

        const counts = tags.map(t => t.count);
        const minCount = Math.min(...counts);
        const maxCount = Math.max(...counts);

        if (maxCount === minCount) return (minFontSize + maxFontSize) / 2;

        const ratio = (count - minCount) / (maxCount - minCount);
        return minFontSize + ratio * (maxFontSize - minFontSize);
    };

    const containerStyles: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        ...style
    };

    const getTagStyles = (tag: TagWithCount): React.CSSProperties => ({
        fontSize: `${getTagSize(tag.count)}px`,
        color: '#4b5563',
        textDecoration: 'none',
        padding: '4px 8px',
        borderRadius: '4px',
        transition: 'all 0.2s',
        display: 'inline-block',
        ...tagStyle
    });

    return (
        <div style={containerStyles} className={className} {...rest}>
            {tags.map(tag => (
                <a
                    key={tag._id}
                    href={`/tag/${tag.slug}`}
                    style={getTagStyles(tag)}
                    title={`${tag.count} posts`}
                >
                    {tag.name}
                </a>
            ))}
        </div>
    );
};