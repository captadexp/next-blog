import React from 'react';
import type {HydratedBlog} from '@supergrowthai/next-blog-types/server';

interface JsonLdProps {
    blog?: HydratedBlog;
    organization?: {
        name: string;
        url: string;
        logo?: string;
        sameAs?: string[];
    };
    website?: {
        name: string;
        url: string;
        searchAction?: boolean;
    };
    breadcrumb?: Array<{
        position: number;
        name: string;
        item: string;
    }>;
    customData?: any;
}

export const JsonLd: React.FC<JsonLdProps> = ({
                                                  blog,
                                                  organization,
                                                  website,
                                                  breadcrumb,
                                                  customData
                                              }) => {
    const generateBlogJsonLd = () => {
        if (!blog) return null;

        const jsonLdOverrides = blog.metadata?.['json-ld:overrides'] || {};
        const permalink = blog.metadata?.['permalink-manager:permalink']?.permalink;
        const baseUrl = website?.url || '';

        const jsonLd: any = {
            '@context': 'https://schema.org',
            '@type': jsonLdOverrides.type || 'BlogPosting',
            headline: jsonLdOverrides.headline || blog.title,
            description: jsonLdOverrides.description || blog.excerpt || '',
            url: `${baseUrl}${permalink || `/${blog.slug}`}`,
            datePublished: new Date(blog.createdAt).toISOString(),
            dateModified: new Date(blog.updatedAt).toISOString(),
            inLanguage: jsonLdOverrides.language || 'en-US'
        };

        // Author
        if (!jsonLdOverrides.hideAuthor) {
            const authorType = jsonLdOverrides.authorType || 'Person';
            const authorName = jsonLdOverrides.authorName || blog.user?.name;

            if (authorName) {
                jsonLd.author = {
                    '@type': authorType,
                    name: authorName,
                    url: jsonLdOverrides.authorUrl || `${baseUrl}/author/${blog.user?.slug}`
                };
            }
        }

        // Publisher
        if (organization) {
            jsonLd.publisher = {
                '@type': 'Organization',
                name: organization.name,
                url: organization.url,
                logo: organization.logo ? {
                    '@type': 'ImageObject',
                    url: organization.logo
                } : undefined
            };
        }

        // Images
        const images: string[] = [];
        if (jsonLdOverrides.featuredImageMedia?.url) {
            images.push(jsonLdOverrides.featuredImageMedia.url);
        } else if (blog.featuredMedia?.url) {
            images.push(blog.featuredMedia.url);
        }

        if (jsonLdOverrides.imagesMedia?.length) {
            images.push(...jsonLdOverrides.imagesMedia.filter((img: any) => img.url).map((img: any) => img.url));
        }

        if (images.length) {
            jsonLd.image = images;
        }

        // Keywords
        const keywords: string[] = [];
        if (blog.tags?.length) {
            keywords.push(...blog.tags.map(t => t.name));
        }
        if (jsonLdOverrides.keywords) {
            keywords.push(...jsonLdOverrides.keywords.split(',').map((k: string) => k.trim()));
        }
        if (keywords.length) {
            jsonLd.keywords = keywords.join(', ');
        }

        // Category
        if (blog.category?.name) {
            jsonLd.articleSection = blog.category.name;
        }

        // Custom JSON properties
        if (jsonLdOverrides.customJson) {
            try {
                const custom = JSON.parse(jsonLdOverrides.customJson);
                Object.assign(jsonLd, custom);
            } catch (e) {
                // Invalid JSON, skip
            }
        }

        return jsonLd;
    };

    const generateOrganizationJsonLd = () => {
        if (!organization) return null;

        const jsonLd: any = {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: organization.name,
            url: organization.url
        };

        if (organization.logo) {
            jsonLd.logo = organization.logo;
        }

        if (organization.sameAs?.length) {
            jsonLd.sameAs = organization.sameAs;
        }

        return jsonLd;
    };

    const generateWebsiteJsonLd = () => {
        if (!website) return null;

        const jsonLd: any = {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: website.name,
            url: website.url
        };

        if (website.searchAction) {
            jsonLd.potentialAction = {
                '@type': 'SearchAction',
                target: {
                    '@type': 'EntryPoint',
                    urlTemplate: `${website.url}/search?q={search_term_string}`
                },
                'query-input': 'required name=search_term_string'
            };
        }

        return jsonLd;
    };

    const generateBreadcrumbJsonLd = () => {
        if (!breadcrumb || breadcrumb.length === 0) return null;

        return {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumb.map(item => ({
                '@type': 'ListItem',
                position: item.position,
                name: item.name,
                item: item.item
            }))
        };
    };

    const schemas = [
        blog && generateBlogJsonLd(),
        !blog && organization && generateOrganizationJsonLd(),
        !blog && website && generateWebsiteJsonLd(),
        breadcrumb && generateBreadcrumbJsonLd(),
        customData
    ].filter(Boolean);

    if (schemas.length === 0) return null;

    return (
        <>
            {schemas.map((schema, index) => (
                <script
                    key={index}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{__html: JSON.stringify(schema)}}
                />
            ))}
        </>
    );
};