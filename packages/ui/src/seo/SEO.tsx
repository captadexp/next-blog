import React from 'react';
import type {Configuration} from '@supergrowthai/next-blog-types';
import {createServerSDK} from '@supergrowthai/next-blog/next';

type EntityType = 'blog' | 'user' | 'category' | 'tag';

interface SEOProps {
    entity: any;
    entityType: EntityType;
    config: Configuration;
}

export async function SEO({entity, entityType, config}: SEOProps) {
    const sdk = await createServerSDK(config);

    const jsonLd = await sdk
        .callRPC('json-ld-structured-data:generateJsonLd', {
            entityType,
            entity
        })
        .then(response => {
            if (response.code !== 0) {
                console.warn("SEO Warning", response.code, response.message);
            }
            return response.payload;
        })
        .catch(() => null);

    if (!jsonLd) {
        return null;
    }

    const url = jsonLd.url || '';
    const siteName = jsonLd.publisher?.name || jsonLd.organization?.name || '';
    const locale = jsonLd.inLanguage?.replace('-', '_') || 'en_US';

    const getMetaData = () => {
        switch (entityType) {
            case 'blog': {
                const title = jsonLd.headline || entity.title;
                const description = jsonLd.description || entity.excerpt || '';
                const image = jsonLd.image?.url || entity.featuredMedia?.url;
                const author = jsonLd.author?.name || entity.user?.name;

                const keywords = [
                    ...(entity.tags?.map((t: any) => t.name) || []),
                    ...(entity.metadata?.['seo-analyzer:config']?.focusKeyword ? [entity.metadata['seo-analyzer:config'].focusKeyword] : []),
                    ...(jsonLd.keywords || [])
                ];

                return {
                    title: siteName ? `${title} | ${siteName}` : title,
                    description,
                    image,
                    author,
                    keywords: keywords.filter(Boolean).join(', '),
                    publishedTime: jsonLd.datePublished,
                    modifiedTime: jsonLd.dateModified,
                    section: jsonLd.articleSection,
                    type: 'article'
                };
            }

            case 'user': {
                const title = jsonLd.name || entity.name;
                const description = jsonLd.description || entity.bio || `Articles by ${entity.name}.`;

                return {
                    title: siteName ? `${title} | Author | ${siteName}` : `${title} | Author`,
                    description,
                    image: jsonLd.image?.url,
                    type: 'profile',
                    profileUsername: entity.username
                };
            }

            case 'category': {
                const title = jsonLd.name || entity.name;
                const description = jsonLd.description || entity.description || `Browse articles in ${entity.name} category.`;

                return {
                    title: siteName ? `${title} | ${siteName}` : title,
                    description,
                    type: 'website'
                };
            }

            case 'tag': {
                const title = jsonLd.name || entity.name;
                const description = jsonLd.description || `Browse articles tagged with "${entity.name}".`;

                return {
                    title: siteName ? `Tag: ${title} | ${siteName}` : `Tag: ${title}`,
                    description,
                    type: 'website'
                };
            }
        }
    };

    const meta = getMetaData();

    return (
        <>
            {/* JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}
            />

            {/* Meta Tags */}
            <title>{meta.title}</title>
            <meta name="title" content={meta.title}/>
            <meta name="description" content={meta.description}/>
            {meta.keywords && <meta name="keywords" content={meta.keywords}/>}
            {meta.author && <meta name="author" content={meta.author}/>}

            {/* Open Graph */}
            <meta property="og:type" content={meta.type}/>
            <meta property="og:url" content={url}/>
            <meta property="og:title" content={meta.title}/>
            <meta property="og:description" content={meta.description}/>
            {meta.image && <meta property="og:image" content={meta.image}/>}
            <meta property="og:locale" content={locale}/>
            <meta property="og:site_name" content={siteName}/>

            {meta.type === 'article' && (
                <>
                    {meta.publishedTime && <meta property="article:published_time" content={meta.publishedTime}/>}
                    {meta.modifiedTime && <meta property="article:modified_time" content={meta.modifiedTime}/>}
                    {meta.author && <meta property="article:author" content={meta.author}/>}
                    {meta.section && <meta property="article:section" content={meta.section}/>}
                </>
            )}

            {meta.type === 'profile' && meta.profileUsername && (
                <meta property="profile:username" content={meta.profileUsername}/>
            )}

            {/* Twitter */}
            <meta property="twitter:card" content={meta.image ? 'summary_large_image' : 'summary'}/>
            <meta property="twitter:url" content={url}/>
            <meta property="twitter:title" content={meta.title}/>
            <meta property="twitter:description" content={meta.description}/>
            {meta.image && <meta property="twitter:image" content={meta.image}/>}

            {/* Canonical */}
            <link rel="canonical" href={url}/>
            <link rel="alternate" href={url} hrefLang={jsonLd.inLanguage?.replace('_', '-') || 'en'}/>
        </>
    );
}