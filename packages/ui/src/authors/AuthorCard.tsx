import React from 'react';
import type {User} from '@supergrowthai/next-blog-types/server';
import {PermalinkWrapper} from '../components/PermalinkWrapper';

interface AuthorCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    author: User;
    postCount?: number;
    showBio?: boolean;
    showEmail?: boolean;
    showAvatar?: boolean;
    style?: React.CSSProperties;
    avatarStyle?: React.CSSProperties;
    nameStyle?: React.CSSProperties;
    bioStyle?: React.CSSProperties;
    metaStyle?: React.CSSProperties;
}

export const AuthorCard: React.FC<AuthorCardProps> = ({
                                                          author,
                                                          postCount,
                                                          showBio = true,
                                                          showEmail = false,
                                                          showAvatar = true,
                                                          style,
                                                          avatarStyle,
                                                          nameStyle,
                                                          bioStyle,
                                                          metaStyle,
                                                          className,
                                                          ...rest
                                                      }) => {
    const containerStyles: React.CSSProperties = {
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        ...style
    };

    const defaultAvatarStyles: React.CSSProperties = {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: '#e0e7ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#4f46e5',
        marginBottom: '16px',
        ...avatarStyle
    };

    const defaultNameStyles: React.CSSProperties = {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '8px',
        ...nameStyle
    };

    const defaultBioStyles: React.CSSProperties = {
        fontSize: '14px',
        color: '#6b7280',
        lineHeight: 1.6,
        marginBottom: '16px',
        maxWidth: '400px',
        ...bioStyle
    };

    const defaultMetaStyles: React.CSSProperties = {
        fontSize: '13px',
        color: '#9ca3af',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        ...metaStyle
    };

    const getInitials = (name: string): string => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <PermalinkWrapper entity={author} fallbackElement="div" style={containerStyles} className={className} {...rest}>
            {showAvatar && (
                <div style={defaultAvatarStyles}>
                    {getInitials(author.name)}
                </div>
            )}

            <h2 style={defaultNameStyles}>
                {author.name}
            </h2>

            {showBio && author.bio && (
                <p style={defaultBioStyles}>
                    {author.bio}
                </p>
            )}

            <div style={defaultMetaStyles}>
                {showEmail && (
                    <a
                        href={`mailto:${author.email}`}
                        style={{color: '#2563eb', textDecoration: 'none'}}
                    >
                        {author.email}
                    </a>
                )}
                {postCount !== undefined && (
                    <span>
            {postCount} {postCount === 1 ? 'article' : 'articles'} published
          </span>
                )}
            </div>
        </PermalinkWrapper>
    );
};