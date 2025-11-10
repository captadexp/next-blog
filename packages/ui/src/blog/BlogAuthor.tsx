import React from 'react';
import type {HydratedBlog} from '@supergrowthai/next-blog-types/server';
import {PermalinkText} from '../components/PermalinkWrapper';

interface BlogAuthorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    blog: HydratedBlog;
    showAvatar?: boolean;
    showBio?: boolean;
    linkToAuthor?: boolean;
    style?: React.CSSProperties;
    avatarStyle?: React.CSSProperties;
    nameStyle?: React.CSSProperties;
    bioStyle?: React.CSSProperties;
}

export const BlogAuthor: React.FC<BlogAuthorProps> = ({
                                                          blog,
                                                          showAvatar = true,
                                                          showBio = false,
                                                          linkToAuthor = true,
                                                          style,
                                                          avatarStyle,
                                                          nameStyle,
                                                          bioStyle,
                                                          className,
                                                          ...rest
                                                      }) => {
    const containerStyles: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        ...style
    };

    const defaultAvatarStyles: React.CSSProperties = {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#6b7280',
        ...avatarStyle
    };

    const defaultNameStyles: React.CSSProperties = {
        fontSize: '14px',
        fontWeight: '500',
        color: linkToAuthor ? '#2563eb' : '#374151',
        textDecoration: 'none',
        ...nameStyle
    };

    const defaultBioStyles: React.CSSProperties = {
        fontSize: '14px',
        color: '#6b7280',
        marginTop: '4px',
        ...bioStyle
    };

    const authorInitial = blog.user.name ? blog.user.name[0].toUpperCase() : 'A';

    const AuthorName = () => {
        if (!linkToAuthor) {
            return <span style={defaultNameStyles}>{blog.user.name}</span>;
        }
        return (
            <PermalinkText entity={blog.user} style={defaultNameStyles}>
                {blog.user.name}
            </PermalinkText>
        );
    };

    return (
        <div style={containerStyles} className={className} {...rest}>
            {showAvatar && (
                <div style={defaultAvatarStyles}>
                    {authorInitial}
                </div>
            )}
            <div>
                <AuthorName/>
                {showBio && blog.user.bio && (
                    <div style={defaultBioStyles}>{blog.user.bio}</div>
                )}
            </div>
        </div>
    );
};