import React from 'react';
import type {Tag} from '@supergrowthai/next-blog-types/server';
import {PermalinkWrapper} from '../components/PermalinkWrapper';

interface TagCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    tag: Tag;
    postCount?: number;
    showDescription?: boolean;
    style?: React.CSSProperties;
    titleStyle?: React.CSSProperties;
    descriptionStyle?: React.CSSProperties;
    countStyle?: React.CSSProperties;
}

export const TagCard: React.FC<TagCardProps> = ({
                                                    tag,
                                                    postCount,
                                                    showDescription = true,
                                                    style,
                                                    titleStyle,
                                                    descriptionStyle,
                                                    countStyle,
                                                    className,
                                                    ...rest
                                                }) => {
    const containerStyles: React.CSSProperties = {
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        transition: 'box-shadow 0.2s',
        cursor: 'pointer',
        ...style
    };

    const defaultTitleStyles: React.CSSProperties = {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '8px',
        ...titleStyle
    };

    const defaultDescriptionStyles: React.CSSProperties = {
        fontSize: '14px',
        color: '#6b7280',
        lineHeight: 1.5,
        marginBottom: postCount !== undefined ? '8px' : '0',
        ...descriptionStyle
    };

    const defaultCountStyles: React.CSSProperties = {
        fontSize: '12px',
        color: '#9ca3af',
        fontWeight: '500',
        ...countStyle
    };

    const description = (tag as any).description || `Posts tagged with ${tag.name}`;

    return (
        <PermalinkWrapper
            entity={tag}
            fallbackElement="div"
            style={containerStyles}
            className={className}
            {...rest}
        >
            <h3 style={defaultTitleStyles}>#{tag.name}</h3>
            {showDescription && (
                <p style={defaultDescriptionStyles}>{description}</p>
            )}
            {postCount !== undefined && (
                <span style={defaultCountStyles}>
          {postCount} {postCount === 1 ? 'post' : 'posts'}
        </span>
            )}
        </PermalinkWrapper>
    );
};