import React from 'react';
import type {Category} from '@supergrowthai/next-blog-types/server';
import {PermalinkWrapper} from '../components/PermalinkWrapper';

interface CategoryListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    categories: Category[];
    layout?: 'grid' | 'list' | 'cards';
    columns?: number;
    style?: React.CSSProperties;
    itemStyle?: React.CSSProperties;
    nameStyle?: React.CSSProperties;
    descriptionStyle?: React.CSSProperties;
}

export const CategoryList: React.FC<CategoryListProps> = ({
                                                              categories,
                                                              layout = 'grid',
                                                              columns = 3,
                                                              style,
                                                              itemStyle,
                                                              nameStyle,
                                                              descriptionStyle,
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
                    gap: '20px',
                    ...baseStyles
                };
            case 'list':
                return {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    ...baseStyles
                };
            case 'cards':
                return {
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gap: '24px',
                    ...baseStyles
                };
            default:
                return baseStyles;
        }
    };

    const getItemStyles = (): React.CSSProperties => {
        const baseStyles: React.CSSProperties = {
            ...itemStyle
        };

        if (layout === 'cards') {
            return {
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                transition: 'box-shadow 0.2s',
                ...baseStyles
            };
        } else if (layout === 'list') {
            return {
                padding: '12px 0',
                borderBottom: '1px solid #e5e7eb',
                ...baseStyles
            };
        }

        return baseStyles;
    };

    const defaultNameStyles: React.CSSProperties = {
        fontSize: layout === 'cards' ? '18px' : '16px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '4px',
        textDecoration: 'none',
        display: 'block',
        ...nameStyle
    };

    const defaultDescriptionStyles: React.CSSProperties = {
        fontSize: '14px',
        color: '#6b7280',
        lineHeight: 1.5,
        ...descriptionStyle
    };

    return (
        <div style={getContainerStyles()} className={className} {...rest}>
            {categories.map(category => (
                <PermalinkWrapper
                    key={category._id}
                    entity={category}
                    fallbackElement="div"
                    style={getItemStyles()}
                >
                    <h3 style={defaultNameStyles}>
                        {category.name}
                    </h3>
                    <p style={defaultDescriptionStyles}>
                        {category.description}
                    </p>
                </PermalinkWrapper>
            ))}
        </div>
    );
};