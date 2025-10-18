import React from 'react';
import type {Category, HydratedBlog, Tag, User} from '@supergrowthai/next-blog-types/server';

type PageType = 'blog' | 'author' | 'category' | 'tag' | 'home';

interface BaseMetaTagsProps {
    baseUrl: string;
    siteName: string;
    locale?: string;
    twitterHandle?: string;
}

interface BlogMetaTagsProps extends BaseMetaTagsProps {
    type: 'blog';
    blog: HydratedBlog;
}

interface AuthorMetaTagsProps extends BaseMetaTagsProps {
    type: 'author';
    author: User;
    postCount?: number;
}

interface CategoryMetaTagsProps extends BaseMetaTagsProps {
    type: 'category';
    category: Category;
    postCount?: number;
}

interface TagMetaTagsProps extends BaseMetaTagsProps {
    type: 'tag';
    tag: Tag;
    postCount?: number;
}

interface HomeMetaTagsProps extends BaseMetaTagsProps {
    type: 'home';
    title: string;
    description: string;
    image?: string;
}

type MetaTagsProps =
    BlogMetaTagsProps
    | AuthorMetaTagsProps
    | CategoryMetaTagsProps
    | TagMetaTagsProps
    | HomeMetaTagsProps;

export const MetaTags: React.FC<MetaTagsProps> = (props) => {
    const getMetaData = () => {
        const {baseUrl, siteName, locale = 'en_US', twitterHandle} = props;

        switch (props.type) {
            case 'blog': {
                const {blog} = props;
                const permalink = blog.metadata?.['permalink-manager:permalink']?.permalink;
                const jsonLdOverrides = blog.metadata?.['json-ld:overrides'];
                const seoConfig = blog.metadata?.['seo-analyzer:config'];

                const title = jsonLdOverrides?.headline || blog.title;
                const description = jsonLdOverrides?.description || blog.excerpt || '';
                const url = `${baseUrl}${permalink || `/${blog.slug}`}`;
                const image = jsonLdOverrides?.featuredImageMedia?.url || blog.featuredMedia?.url;
                const author = jsonLdOverrides?.authorName || blog.user.name;
                const keywords = [
                    ...(blog.tags?.map(t => t.name) || []),
                    ...(seoConfig?.focusKeyword ? [seoConfig.focusKeyword] : []),
                    ...(jsonLdOverrides?.keywords?.split(',').map((k: string) => k.trim()) || [])
                ];

                return {
                    title: `${title} | ${siteName}`,
                    description,
                    url,
                    image,
                    author,
                    keywords: keywords.join(', '),
                    publishedTime: new Date(blog.createdAt).toISOString(),
                    modifiedTime: new Date(blog.updatedAt).toISOString(),
                    section: blog.category?.name,
                    type: 'article'
                };
            }

            case 'author': {
                const {author, postCount} = props;
                const title = `${author.name} | Author`;
                const description = author.bio || `Articles by ${author.name}. ${postCount ? `${postCount} posts published.` : ''}`;
                const url = `${baseUrl}/author/${author.slug}`;

                return {
                    title: `${title} | ${siteName}`,
                    description,
                    url,
                    type: 'profile',
                    profileUsername: author.username
                };
            }

            case 'category': {
                const {category, postCount} = props;
                const title = category.name;
                const description = category.description || `Browse ${postCount || 'all'} articles in ${category.name} category.`;
                const url = `${baseUrl}/category/${category.slug}`;

                return {
                    title: `${title} | ${siteName}`,
                    description,
                    url,
                    type: 'website'
                };
            }

            case 'tag': {
                const {tag, postCount} = props;
                const title = `Tag: ${tag.name}`;
                const description = `Browse ${postCount || 'all'} articles tagged with "${tag.name}".`;
                const url = `${baseUrl}/tag/${tag.slug}`;

                return {
                    title: `${title} | ${siteName}`,
                    description,
                    url,
                    type: 'website'
                };
            }

            case 'home': {
                const {title, description, image} = props;
                const url = baseUrl;

                return {
                    title: `${title} | ${siteName}`,
                    description,
                    url,
                    image,
                    type: 'website'
                };
            }
        }
    };

    const meta = getMetaData();
    const {locale = 'en_US', twitterHandle, siteName} = props;

    return (
        <>
            {/* Primary Meta Tags */}
            <title>{meta.title}</title>
            <meta name="title" content={meta.title}/>
            <meta name="description" content={meta.description}/>
            {meta.keywords && <meta name="keywords" content={meta.keywords}/>}
            {meta.author && <meta name="author" content={meta.author}/>}

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={meta.type}/>
            <meta property="og:url" content={meta.url}/>
            <meta property="og:title" content={meta.title}/>
            <meta property="og:description" content={meta.description}/>
            {meta.image && <meta property="og:image" content={meta.image}/>}
            <meta property="og:locale" content={locale}/>
            <meta property="og:site_name" content={siteName}/>

            {/* Article specific */}
            {meta.type === 'article' && (
                <>
                    {meta.publishedTime && <meta property="article:published_time" content={meta.publishedTime}/>}
                    {meta.modifiedTime && <meta property="article:modified_time" content={meta.modifiedTime}/>}
                    {meta.author && <meta property="article:author" content={meta.author}/>}
                    {meta.section && <meta property="article:section" content={meta.section}/>}
                </>
            )}

            {/* Profile specific */}
            {meta.type === 'profile' && meta.profileUsername && (
                <meta property="profile:username" content={meta.profileUsername}/>
            )}

            {/* Twitter */}
            <meta property="twitter:card" content={meta.image ? 'summary_large_image' : 'summary'}/>
            <meta property="twitter:url" content={meta.url}/>
            <meta property="twitter:title" content={meta.title}/>
            <meta property="twitter:description" content={meta.description}/>
            {meta.image && <meta property="twitter:image" content={meta.image}/>}
            {twitterHandle && <meta property="twitter:site" content={twitterHandle}/>}
        </>
    );
};