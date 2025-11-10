import React from 'react';
import {getPermalink} from '../utils/permalink';
import type {Category, HydratedBlog, HydratedCategory, Tag, User} from '@supergrowthai/next-blog-types/server';

type EntityWithPermalink = HydratedBlog | HydratedCategory | User | Tag | Category;

interface PermalinkWrapperProps extends Omit<React.HTMLAttributes<HTMLDivElement | HTMLAnchorElement>, 'style'> {
    entity: EntityWithPermalink | null | undefined;
    children: React.ReactNode;
    style?: React.CSSProperties;
    fallbackElement?: 'div' | 'article';
    disabled?: boolean;
}

export const PermalinkWrapper: React.FC<PermalinkWrapperProps> = ({
                                                                      entity,
                                                                      children,
                                                                      style,
                                                                      fallbackElement = 'div',
                                                                      disabled = false,
                                                                      className,
                                                                      ...rest
                                                                  }) => {
    const permalink = !disabled ? getPermalink(entity) : undefined;

    const baseStyles: React.CSSProperties = {
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        ...style
    };

    if (permalink) {
        return (
            <a
                href={permalink}
                style={baseStyles}
                className={className}
                {...rest}
            >
                {children}
            </a>
        );
    }

    const Element = fallbackElement;
    return (
        <Element
            style={style}
            className={className}
            {...rest}
        >
            {children}
        </Element>
    );
};

interface PermalinkTextProps extends Omit<React.HTMLAttributes<HTMLSpanElement | HTMLAnchorElement>, 'style'> {
    entity: EntityWithPermalink | null | undefined;
    children: React.ReactNode;
    style?: React.CSSProperties;
    linkStyle?: React.CSSProperties;
    disabled?: boolean;
}

export const PermalinkText: React.FC<PermalinkTextProps> = ({
                                                                entity,
                                                                children,
                                                                style,
                                                                linkStyle,
                                                                disabled = false,
                                                                className,
                                                                ...rest
                                                            }) => {
    const permalink = !disabled ? getPermalink(entity) : undefined;

    if (permalink) {
        const defaultLinkStyles: React.CSSProperties = {
            color: '#2563eb',
            textDecoration: 'none',
            ...linkStyle
        };

        return (
            <a
                href={permalink}
                style={{...style, ...defaultLinkStyles}}
                className={className}
                {...rest}
            >
                {children}
            </a>
        );
    }

    return (
        <span
            style={style}
            className={className}
            {...rest}
        >
            {children}
        </span>
    );
};