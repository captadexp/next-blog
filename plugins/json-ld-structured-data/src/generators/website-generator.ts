import type {WebSite} from '../types/core-types.js';
import type {GlobalJsonLdSettings} from '../types/plugin-types.js';

/**
 * Generate WebSite schema from global settings
 */
export function generateWebSiteSchema(globalSettings: GlobalJsonLdSettings): WebSite | null {
    const website = globalSettings.website;
    if (!website?.name && !website?.url) {
        return null;
    }

    const webSite: WebSite = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: website?.name || '',
        url: website?.url || ''
    };

    if (website?.description) {
        webSite.description = website.description;
    }

    // Add organization as publisher if available
    const org = globalSettings.organization;
    if (org?.name && org?.url) {
        webSite.publisher = {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: org.name,
            url: org.url
        };
    }

    // Add search action if enabled
    if (website?.searchAction?.enabled && website?.searchAction?.urlTemplate) {
        webSite.potentialAction = {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: website.searchAction.urlTemplate
            },
            'query-input': 'required name=search_term_string'
        };
    }

    if (globalSettings.defaultLanguage) {
        webSite.inLanguage = globalSettings.defaultLanguage;
    }

    return webSite;
}