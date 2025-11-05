import React from 'react';
import type {User} from '@supergrowthai/next-blog-types/server';

interface AuthorWithCount extends User {
    postCount?: number;
}

interface AuthorListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    authors: AuthorWithCount[];
    layout?: 'grid' | 'list';
    columns?: number;
    showBio?: boolean;
    showPostCount?: boolean;
    style?: React.CSSProperties;
    itemStyle?: React.CSSProperties;
    avatarStyle?: React.CSSProperties;
    nameStyle?: React.CSSProperties;
    bioStyle?: React.CSSProperties;
    countStyle?: React.CSSProperties;
}

export const AuthorList: React.FC<AuthorListProps> = ({
                                                          authors,
                                                          layout = 'grid',
                                                          columns = 3,
                                                          showBio = true,
                                                          showPostCount = true,
                                                          style,
                                                          itemStyle,
                                                          avatarStyle,
                                                          nameStyle,
                                                          bioStyle,
                                                          countStyle,
                                                          className,
                                                          ...rest
                                                      }) => {
    const getContainerStyles = (): React.CSSProperties => {
        const baseStyles: React.CSSProperties = {
            ...style
        };

        if (layout === 'grid') {
            return {
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: '24px',
                ...baseStyles
            };
        }

        return {
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            ...baseStyles
        };
    };

    const getItemStyles = (): React.CSSProperties => {
        const baseStyles: React.CSSProperties = {
            ...itemStyle
        };

        if (layout === 'grid') {
            return {
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                textAlign: 'center',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                ...baseStyles
            };
        }

        return {
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            transition: 'background-color 0.2s',
            cursor: 'pointer',
            ...baseStyles
        };
    };

    const defaultAvatarStyles: React.CSSProperties = {
        width: layout === 'grid' ? '64px' : '48px',
        height: layout === 'grid' ? '64px' : '48px',
        borderRadius: '50%',
        backgroundColor: '#e0e7ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: layout === 'grid' ? '24px' : '18px',
        fontWeight: 'bold',
        color: '#4f46e5',
        margin: layout === 'grid' ? '0 auto 12px' : '0',
        flexShrink: 0,
        ...avatarStyle
    };

    const defaultNameStyles: React.CSSProperties = {
        fontSize: layout === 'grid' ? '18px' : '16px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: layout === 'grid' && showBio ? '4px' : '0',
        textDecoration: 'none',
        ...nameStyle
    };

    const defaultBioStyles: React.CSSProperties = {
        fontSize: '14px',
        color: '#6b7280',
        lineHeight: 1.5,
        marginBottom: layout === 'grid' && showPostCount ? '8px' : '0',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        ...bioStyle
    };

    const defaultCountStyles: React.CSSProperties = {
        fontSize: '12px',
        color: '#9ca3af',
        fontWeight: '500',
        ...countStyle
    };

    const getInitials = (name: string): string => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div style={getContainerStyles()} className={className} {...rest}>
            {authors.map(author => (
                <div
                    key={author._id}
                    style={getItemStyles()}
                >
                    <div style={defaultAvatarStyles}>
                        {getInitials(author.name)}
                    </div>

                    <div style={{flex: layout === 'list' ? 1 : 'none'}}>
                        {author.metadata?.['permalink-manager:permalink']?.permalink ? (
                            <a
                                href={author.metadata['permalink-manager:permalink'].permalink}
                                style={defaultNameStyles}
                            >
                                {author.name}
                            </a>
                        ) : (
                            <span style={defaultNameStyles}>
                                {author.name}
                            </span>
                        )}

                        {showBio && author.bio && (
                            <p style={defaultBioStyles}>
                                {author.bio}
                            </p>
                        )}

                        {showPostCount && author.postCount !== undefined && (
                            <p style={defaultCountStyles}>
                                {author.postCount} {author.postCount === 1 ? 'article' : 'articles'}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};