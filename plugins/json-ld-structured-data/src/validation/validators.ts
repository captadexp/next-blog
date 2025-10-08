import type {ValidationError, ValidationResult, ValidationWarning} from '../types/validation-types.js';

/**
 * Validate JSON-LD output
 */
export function validateJsonLd(jsonLd: any, schemaType: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (Array.isArray(jsonLd)) {
        // Validate each schema in the array
        jsonLd.forEach((schema, index) => {
            const result = validateSingleSchema(schema);
            errors.push(...result.errors.map(e => ({...e, field: `${index}.${e.field}`})));
            warnings.push(...result.warnings.map(w => ({...w, field: `${index}.${w.field}`})));
        });
    } else {
        const result = validateSingleSchema(jsonLd);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate a single schema object
 */
function validateSingleSchema(schema: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!schema['@context']) {
        errors.push({field: '@context', message: '@context is required'});
    }

    if (!schema['@type']) {
        errors.push({field: '@type', message: '@type is required'});
    }

    // Type-specific validation
    switch (schema['@type']) {
        case 'Article':
        case 'BlogPosting':
        case 'NewsArticle':
        case 'TechArticle':
            validateArticle(schema, errors, warnings);
            break;
        case 'Organization':
            validateOrganization(schema, errors, warnings);
            break;
        case 'WebSite':
            validateWebSite(schema, errors, warnings);
            break;
        case 'HowTo':
            validateHowTo(schema, errors, warnings);
            break;
        case 'Review':
            validateReview(schema, errors, warnings);
            break;
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

function validateArticle(article: any, errors: ValidationError[], warnings: ValidationWarning[]) {
    if (!article.headline) {
        errors.push({field: 'headline', message: 'Headline is required for articles'});
    } else if (article.headline.length > 110) {
        warnings.push({field: 'headline', message: 'Headline should be under 110 characters for best SEO results'});
    }

    if (!article.author) {
        warnings.push({field: 'author', message: 'Author information helps with search engine understanding'});
    }

    if (!article.datePublished) {
        warnings.push({field: 'datePublished', message: 'Published date helps with search engine ranking'});
    }

    if (!article.image) {
        warnings.push({field: 'image', message: 'Images improve social media sharing and search results'});
    }
}

function validateOrganization(org: any, errors: ValidationError[], warnings: ValidationWarning[]) {
    if (!org.name) {
        errors.push({field: 'name', message: 'Organization name is required'});
    }

    if (!org.url) {
        errors.push({field: 'url', message: 'Organization URL is required'});
    }

    if (!org.logo) {
        warnings.push({field: 'logo', message: 'Organization logo helps with brand recognition'});
    }
}

function validateWebSite(website: any, errors: ValidationError[], warnings: ValidationWarning[]) {
    if (!website.name) {
        warnings.push({field: 'name', message: 'Website name improves search engine understanding'});
    }

    if (!website.url) {
        errors.push({field: 'url', message: 'Website URL is required'});
    }
}

function validateHowTo(howTo: any, errors: ValidationError[], warnings: ValidationWarning[]) {
    if (!howTo.name) {
        errors.push({field: 'name', message: 'HowTo name is required'});
    }

    if (!howTo.step || !Array.isArray(howTo.step) || howTo.step.length === 0) {
        warnings.push({field: 'step', message: 'HowTo should include step-by-step instructions'});
    }
}

function validateReview(review: any, errors: ValidationError[], warnings: ValidationWarning[]) {
    if (!review.itemReviewed?.name) {
        errors.push({field: 'itemReviewed.name', message: 'Item being reviewed must have a name'});
    }

    if (!review.reviewRating) {
        warnings.push({field: 'reviewRating', message: 'Review rating helps users understand the evaluation'});
    }
}