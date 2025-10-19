import React from 'react';
import type {HydratedBlog} from '@supergrowthai/next-blog-types/server';

interface FeaturedMediaProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    blog: HydratedBlog;
    style?: React.CSSProperties;
    imageStyle?: React.CSSProperties;
    videoStyle?: React.CSSProperties;
}

export const FeaturedMedia: React.FC<FeaturedMediaProps> = ({
                                                                blog,
                                                                style,
                                                                imageStyle,
                                                                videoStyle,
                                                                className,
                                                                ...rest
                                                            }) => {
    const media = blog.featuredMedia ||
        blog.metadata?.['json-ld-structured-data:overrides']?.featuredImageMedia;

    if (!media?.url) {
        return null;
    }

    const containerStyles: React.CSSProperties = {
        width: '100%',
        marginBottom: '2rem',
        ...style
    };

    const isVideo = media.mimeType?.startsWith('video/');

    if (isVideo) {
        const defaultVideoStyles: React.CSSProperties = {
            width: '100%',
            height: 'auto',
            borderRadius: '8px',
            objectFit: 'cover',
            ...videoStyle
        };

        return (
            <div
                style={containerStyles}
                className={className}
                {...rest}
            >
                <video
                    src={media.url}
                    poster={media.thumbnailUrl}
                    controls
                    style={defaultVideoStyles}
                    preload="metadata"
                >
                    Your browser does not support the video tag.
                </video>
            </div>
        );
    }

    const defaultImageStyles: React.CSSProperties = {
        width: '100%',
        height: 'auto',
        borderRadius: '8px',
        objectFit: 'cover',
        ...imageStyle
    };

    return (
        <div
            style={containerStyles}
            className={className}
            {...rest}
        >
            <img
                src={media.url}
                alt={media.altText || blog.title}
                style={defaultImageStyles}
                width={media.width}
                height={media.height}
            />
        </div>
    );
};