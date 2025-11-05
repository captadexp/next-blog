'use client';

import React from 'react';
import type {Category} from '@supergrowthai/next-blog-types/server';

interface CategoryWithChildren extends Category {
    children?: CategoryWithChildren[];
}

interface CategoryTreeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    categories: Category[];
    expandAll?: boolean;
    style?: React.CSSProperties;
    itemStyle?: React.CSSProperties;
    nameStyle?: React.CSSProperties;
    childrenStyle?: React.CSSProperties;
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({
                                                              categories,
                                                              expandAll = true,
                                                              style,
                                                              itemStyle,
                                                              nameStyle,
                                                              childrenStyle,
                                                              className,
                                                              ...rest
                                                          }) => {
    const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(
        new Set(expandAll ? categories.map(c => c._id) : [])
    );

    const buildTree = (cats: Category[]): CategoryWithChildren[] => {
        const tree: CategoryWithChildren[] = [];
        const lookup: { [key: string]: CategoryWithChildren } = {};

        // Create lookup
        cats.forEach(cat => {
            lookup[cat._id] = {...cat, children: []};
        });

        // Build tree
        cats.forEach(cat => {
            if (cat.parentId && lookup[cat.parentId]) {
                lookup[cat.parentId].children!.push(lookup[cat._id]);
            } else {
                tree.push(lookup[cat._id]);
            }
        });

        return tree;
    };

    const toggleExpand = (categoryId: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    };

    const renderCategory = (category: CategoryWithChildren, depth: number = 0) => {
        const hasChildren = category.children && category.children.length > 0;
        const isExpanded = expandedCategories.has(category._id);

        const itemStyles: React.CSSProperties = {
            paddingLeft: `${depth * 20}px`,
            ...itemStyle
        };

        const defaultNameStyles: React.CSSProperties = {
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            cursor: 'pointer',
            borderRadius: '4px',
            transition: 'background-color 0.2s',
            ...nameStyle
        };

        const defaultChildrenStyles: React.CSSProperties = {
            marginTop: '4px',
            ...childrenStyle
        };

        return (
            <div key={category._id} style={itemStyles}>
                <div
                    style={defaultNameStyles}
                    onClick={() => hasChildren && toggleExpand(category._id)}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    {hasChildren && (
                        <span style={{marginRight: '8px', fontSize: '12px', color: '#6b7280'}}>
              {isExpanded ? '▼' : '▶'}
            </span>
                    )}
                    {category.metadata?.['permalink-manager:permalink']?.permalink ? (
                        <a
                            href={category.metadata['permalink-manager:permalink'].permalink}
                            style={{
                                color: '#374151',
                                textDecoration: 'none',
                                fontWeight: depth === 0 ? '600' : '400',
                                fontSize: depth === 0 ? '16px' : '14px'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {category.name}
                        </a>
                    ) : (
                        <span
                            style={{
                                color: '#374151',
                                fontWeight: depth === 0 ? '600' : '400',
                                fontSize: depth === 0 ? '16px' : '14px'
                            }}
                        >
                            {category.name}
                        </span>
                    )}
                    {category.description && (
                        <span style={{marginLeft: '12px', fontSize: '12px', color: '#9ca3af'}}>
              {category.description.length > 50
                  ? `${category.description.substring(0, 50)}...`
                  : category.description}
            </span>
                    )}
                </div>

                {hasChildren && isExpanded && (
                    <div style={defaultChildrenStyles}>
                        {category.children!.map(child => renderCategory(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    const containerStyles: React.CSSProperties = {
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '8px',
        ...style
    };

    const tree = buildTree(categories);

    return (
        <div style={containerStyles} className={className} {...rest}>
            {tree.map(category => renderCategory(category))}
        </div>
    );
};