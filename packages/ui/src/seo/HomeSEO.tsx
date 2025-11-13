import React from 'react';

interface HomeSEOProps {
    title: string;
    description: string;
    url: string;
    siteName?: string;
    image?: string;
    locale?: string;
    twitterHandle?: string;
}

/**
 * SEO component specifically for the home page
 * Doesn't require entity or RPC calls
 */
export function HomeSEO({
                            title,
                            description,
                            url,
                            siteName = '',
                            image,
                            locale = 'en_US',
                            twitterHandle
                        }: HomeSEOProps) {
    const fullTitle = siteName ? `${title} | ${siteName}` : title;

    return (
        <>
            {/* Primary Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="title" content={fullTitle}/>
            <meta name="description" content={description}/>

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website"/>
            <meta property="og:url" content={url}/>
            <meta property="og:title" content={fullTitle}/>
            <meta property="og:description" content={description}/>
            {image && <meta property="og:image" content={image}/>}
            <meta property="og:locale" content={locale}/>
            {siteName && <meta property="og:site_name" content={siteName}/>}

            {/* Twitter */}
            <meta property="twitter:card" content={image ? 'summary_large_image' : 'summary'}/>
            <meta property="twitter:url" content={url}/>
            <meta property="twitter:title" content={fullTitle}/>
            <meta property="twitter:description" content={description}/>
            {image && <meta property="twitter:image" content={image}/>}
            {twitterHandle && <meta property="twitter:site" content={twitterHandle}/>}

            {/* Canonical */}
            <link rel="canonical" href={url}/>
            <link rel="alternate" href={url} hrefLang={locale.replace('_', '-')}/>

            {/* Home page specific JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'WebSite',
                        url,
                        name: siteName || title,
                        description,
                        inLanguage: locale.replace('_', '-')
                    })
                }}
            />
        </>
    );
}