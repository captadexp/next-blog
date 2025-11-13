import React from 'react';
import type {Tag} from '@supergrowthai/next-blog-types/server';
import {PermalinkWrapper} from '../components/PermalinkWrapper';

interface TagListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    tags: Tag[];
    layout?: 'grid' | 'list' | 'inline';
    columns?: { sm?: number; md?: number; lg?: number };
    style?: React.CSSProperties;
    itemStyle?: React.CSSProperties;
    linkStyle?: React.CSSProperties;
}

export const TagList: React.FC<TagListProps> = ({
                                                    tags,
                                                    layout = 'grid',
                                                    columns = {sm: 2, md: 3, lg: 4},
                                                    style,
                                                    itemStyle,
                                                    linkStyle,
                                                    className,
                                                    ...rest
                                                }) => {
    const sm = columns.sm || 2;
    const md = columns.md || 3;
    const lg = columns.lg || 4;
    const gridClassName = `tag-grid-${Math.random().toString(36).substr(2, 9)}`;

    const getContainerStyles = (): React.CSSProperties => {
        const baseStyles: React.CSSProperties = {
            ...style
        };

        switch (layout) {
            case 'grid':
                return baseStyles;
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
        <>
            {layout === 'grid' && (
                <style dangerouslySetInnerHTML={{
                    __html: `
                        .${gridClassName} {
                            display: grid;
                            grid-template-columns: repeat(${sm}, 1fr);
                            gap: 16px;
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
                className={`${layout === 'grid' ? gridClassName : ''} ${className || ''}`}
                {...rest}
            >
                {tags.map(tag => (
                    <PermalinkWrapper key={tag._id} entity={tag} fallbackElement="div" style={defaultItemStyles}>
                        <span style={defaultLinkStyles}>
                            #{tag.name}
                        </span>
                    </PermalinkWrapper>
                ))}
            </div>
        </>
    );
};