import React from 'react';
import {DatabaseAdapter, DetailedBlog} from '@supergrowthai/types';

interface AuthorInfoProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    db: DatabaseAdapter;
    blog: DetailedBlog;
    style?: React.CSSProperties;
    imageStyle?: React.CSSProperties;
    nameStyle?: React.CSSProperties;
    bioStyle?: React.CSSProperties;
}

export const AuthorInfo: React.FC<AuthorInfoProps> = ({
                                                          db,
                                                          blog,
                                                          style,
                                                          imageStyle,
                                                          nameStyle,
                                                          bioStyle,
                                                          ...rest
                                                      }) => {
    const {user} = blog;

    const containerStyles: React.CSSProperties = {
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        ...style,
    };

    const imageStyles: React.CSSProperties = {
        width: '4rem',
        height: '4rem',
        backgroundColor: '#E5E7EB',
        borderRadius: '9999px',
        marginRight: '16px',
        ...imageStyle,
    };

    const nameStyles: React.CSSProperties = {
        fontSize: '1.125rem',
        fontWeight: 'bold',
        ...nameStyle,
    };

    const bioStyles: React.CSSProperties = {
        color: '#4B5563',
        ...bioStyle,
    };

    return (
        <div style={containerStyles} {...rest}>
            {/* Placeholder for author image */}
            <div style={imageStyles}></div>
            <div>
                <h4 style={nameStyles}>{user.name}</h4>
                <p style={bioStyles}>{user.bio}</p>
            </div>
        </div>
    );
};
