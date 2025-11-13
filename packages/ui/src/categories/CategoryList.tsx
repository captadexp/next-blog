import React from 'react';
import type {Category} from '@supergrowthai/next-blog-types/server';
import {PermalinkWrapper} from '../components/PermalinkWrapper';

interface CategoryListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    categories: Category[];
    layout?: 'grid' | 'list' | 'cards';
    columns?: { sm?: number; md?: number; lg?: number };
    style?: React.CSSProperties;
    itemStyle?: React.CSSProperties;
    nameStyle?: React.CSSProperties;
    descriptionStyle?: React.CSSProperties;
}

export const CategoryList: React.FC<CategoryListProps> = ({
                                                              categories,
                                                              layout = 'grid',
                                                              columns = {sm: 1, md: 2, lg: 3},
                                                              style,
                                                              itemStyle,
                                                              nameStyle,
                                                              descriptionStyle,
                                                              className,
                                                              ...rest
                                                          }) => {
    const sm = columns.sm || 1;
    const md = columns.md || 2;
    const lg = columns.lg || 3;
    const gridClassName = `category-grid-${Math.random().toString(36).substr(2, 9)}`;

    const getContainerStyles = (): React.CSSProperties => {
        const baseStyles: React.CSSProperties = {
            ...style
        };

        switch (layout) {
            case 'grid':
            case 'cards':
                return baseStyles;
            case 'list':
                return {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
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
        <>
            {(layout === 'grid' || layout === 'cards') && (
                <style dangerouslySetInnerHTML={{
                    __html: `
                        .${gridClassName} {
                            display: grid;
                            grid-template-columns: repeat(${sm}, 1fr);
                            gap: ${layout === 'cards' ? '24px' : '20px'};
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
            )}
            <div
                style={getContainerStyles()}
                className={`${(layout === 'grid' || layout === 'cards') ? gridClassName : ''} ${className || ''}`}
                {...rest}
            >
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
        </>
    );
};