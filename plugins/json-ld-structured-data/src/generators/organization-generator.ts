import type {Organization} from '../types/core-types.js';
import type {GlobalJsonLdSettings} from '../types/plugin-types.js';

/**
 * Generate Organization schema from global settings
 */
export function generateOrganizationSchema(globalSettings: GlobalJsonLdSettings): Organization | null {
    const org = globalSettings.organization;
    if (!org?.name || !org?.url) {
        return null;
    }

    const organization: Organization = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: org.name,
        url: org.url
    };

    if (org.logo) {
        organization.logo = {
            '@type': 'ImageObject',
            url: org.logo
        };
    }

    if (org.description) {
        organization.description = org.description;
    }

    if (org.sameAs && org.sameAs.length > 0) {
        organization.sameAs = org.sameAs.filter(url => url.trim());
    }

    if (org.address && (org.address.streetAddress || org.address.addressLocality)) {
        organization.address = {
            '@type': 'PostalAddress',
            ...(org.address.streetAddress && {streetAddress: org.address.streetAddress}),
            ...(org.address.addressLocality && {addressLocality: org.address.addressLocality}),
            ...(org.address.addressRegion && {addressRegion: org.address.addressRegion}),
            ...(org.address.postalCode && {postalCode: org.address.postalCode}),
            ...(org.address.addressCountry && {addressCountry: org.address.addressCountry})
        };
    }

    if (org.telephone) {
        organization.telephone = org.telephone;
    }

    if (org.email) {
        organization.email = org.email;
    }

    return organization;
}