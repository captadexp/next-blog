import React from 'react';
import type {User} from '@supergrowthai/next-blog-types/server';
import {PermalinkText} from '../components/PermalinkWrapper';

interface AuthorBioProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    author: User;
    showAvatar?: boolean;
    avatarPosition?: 'left' | 'top';
    showSocialLinks?: boolean;
    socialLinks?: {
        twitter?: string;
        linkedin?: string;
        github?: string;
        website?: string;
    };
    style?: React.CSSProperties;
    avatarStyle?: React.CSSProperties;
    contentStyle?: React.CSSProperties;
    nameStyle?: React.CSSProperties;
    bioStyle?: React.CSSProperties;
    socialStyle?: React.CSSProperties;
}

export const AuthorBio: React.FC<AuthorBioProps> = ({
                                                        author,
                                                        showAvatar = true,
                                                        avatarPosition = 'left',
                                                        showSocialLinks = true,
                                                        socialLinks,
                                                        style,
                                                        avatarStyle,
                                                        contentStyle,
                                                        nameStyle,
                                                        bioStyle,
                                                        socialStyle,
                                                        className,
                                                        ...rest
                                                    }) => {
    const containerStyles: React.CSSProperties = {
        display: 'flex',
        flexDirection: avatarPosition === 'top' ? 'column' : 'row',
        gap: '20px',
        padding: '24px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        alignItems: avatarPosition === 'top' ? 'center' : 'flex-start',
        ...style
    };

    const defaultAvatarStyles: React.CSSProperties = {
        width: avatarPosition === 'top' ? '120px' : '100px',
        height: avatarPosition === 'top' ? '120px' : '100px',
        borderRadius: '50%',
        backgroundColor: '#ddd6fe',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: avatarPosition === 'top' ? '48px' : '40px',
        fontWeight: 'bold',
        color: '#7c3aed',
        flexShrink: 0,
        ...avatarStyle
    };

    const defaultContentStyles: React.CSSProperties = {
        flex: 1,
        textAlign: avatarPosition === 'top' ? 'center' : 'left',
        ...contentStyle
    };

    const defaultNameStyles: React.CSSProperties = {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '4px',
        ...nameStyle
    };

    const defaultBioStyles: React.CSSProperties = {
        fontSize: '15px',
        color: '#4b5563',
        lineHeight: 1.7,
        marginBottom: showSocialLinks ? '12px' : '0',
        ...bioStyle
    };

    const defaultSocialStyles: React.CSSProperties = {
        display: 'flex',
        gap: '12px',
        justifyContent: avatarPosition === 'top' ? 'center' : 'flex-start',
        ...socialStyle
    };

    const socialLinkStyle: React.CSSProperties = {
        color: '#6b7280',
        textDecoration: 'none',
        fontSize: '14px',
        transition: 'color 0.2s'
    };

    const getInitials = (name: string): string => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div style={containerStyles} className={className} {...rest}>
            {showAvatar && (
                <div style={defaultAvatarStyles}>
                    {getInitials(author.name)}
                </div>
            )}

            <div style={defaultContentStyles}>
                <PermalinkText entity={author} style={defaultNameStyles}>
                    {author.name}
                </PermalinkText>
                <p style={defaultBioStyles}>
                    {author.bio || `${author.name} is a contributor to this blog.`}
                </p>

                {showSocialLinks && socialLinks && (
                    <div style={defaultSocialStyles}>
                        {socialLinks.twitter && (
                            <a
                                href={socialLinks.twitter}
                                style={socialLinkStyle}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Twitter
                            </a>
                        )}
                        {socialLinks.linkedin && (
                            <a
                                href={socialLinks.linkedin}
                                style={socialLinkStyle}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                LinkedIn
                            </a>
                        )}
                        {socialLinks.github && (
                            <a
                                href={socialLinks.github}
                                style={socialLinkStyle}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                GitHub
                            </a>
                        )}
                        {socialLinks.website && (
                            <a
                                href={socialLinks.website}
                                style={socialLinkStyle}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Website
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};