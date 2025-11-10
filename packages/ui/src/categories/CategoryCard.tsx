import React from 'react';
import type {Category} from '@supergrowthai/next-blog-types/server';
import {PermalinkWrapper} from '../components/PermalinkWrapper';

interface CategoryCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    category: Category;
    postCount?: number;
    showDescription?: boolean;
    showIcon?: boolean;
    style?: React.CSSProperties;
    titleStyle?: React.CSSProperties;
    descriptionStyle?: React.CSSProperties;
    countStyle?: React.CSSProperties;
    iconStyle?: React.CSSProperties;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
                                                              category,
                                                              postCount,
                                                              showDescription = true,
                                                              showIcon = false,
                                                              style,
                                                              titleStyle,
                                                              descriptionStyle,
                                                              countStyle,
                                                              iconStyle,
                                                              className,
                                                              ...rest
                                                          }) => {
    const containerStyles: React.CSSProperties = {
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        transition: 'all 0.3s',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        ...style
    };

    const defaultIconStyles: React.CSSProperties = {
        width: '48px',
        height: '48px',
        backgroundColor: '#eff6ff',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
        fontSize: '24px',
        ...iconStyle
    };

    const defaultTitleStyles: React.CSSProperties = {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '8px',
        ...titleStyle
    };

    const defaultDescriptionStyles: React.CSSProperties = {
        fontSize: '14px',
        color: '#6b7280',
        lineHeight: 1.6,
        marginBottom: postCount !== undefined ? '12px' : '0',
        ...descriptionStyle
    };

    const defaultCountStyles: React.CSSProperties = {
        fontSize: '13px',
        color: '#9ca3af',
        fontWeight: '500',
        display: 'inline-block',
        padding: '4px 8px',
        backgroundColor: '#f3f4f6',
        borderRadius: '4px',
        ...countStyle
    };

    const getCategoryIcon = (): string => {
        const firstLetter = category.name[0].toUpperCase();
        return firstLetter;
    };

    return (
        <PermalinkWrapper
            entity={category}
            fallbackElement="div"
            style={containerStyles}
            className={className}
            {...rest}
        >
            {showIcon && (
                <div style={defaultIconStyles}>
                    {getCategoryIcon()}
                </div>
            )}

            <h3 style={defaultTitleStyles}>{category.name}</h3>

            {showDescription && (
                <p style={defaultDescriptionStyles}>
                    {category.description}
                </p>
            )}

            {postCount !== undefined && (
                <span style={defaultCountStyles}>
          {postCount} {postCount === 1 ? 'article' : 'articles'}
        </span>
            )}
        </PermalinkWrapper>
    );
};