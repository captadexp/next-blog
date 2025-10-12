import type {BlogJsonLdOverrides, GlobalJsonLdSettings} from './plugin-types.js';
import type {ValidationResult} from './validation-types.js';
import type {JsonLdOutput} from './core-types.js';

// RPC method augmentations for @supergrowthai/types
// Framework wraps with {code, message, payload}, RPC also wraps with {code, message, payload}
// So final structure is: {code, message, payload: {code, message, payload: ACTUAL_DATA}}

declare module '@supergrowthai/plugin-dev-kit' {
    interface RPCMethods {
        'jsonLd:getGlobalSettings': {
            request: {};
            response: {
                code: 0 | -1;
                message: string;
                payload: {
                    settings: GlobalJsonLdSettings;
                };
            };
        };

        'jsonLd:saveGlobalSettings': {
            request: {
                settings: GlobalJsonLdSettings;
            };
            response: {
                code: 0 | -1;
                message: string;
                payload: {
                    success: boolean;
                };
            };
        };

        'jsonLd:getBlogOverrides': {
            request: {
                blogId: string;
            };
            response: {
                code: 0 | -1;
                message: string;
                payload: {
                    overrides: BlogJsonLdOverrides | null;
                };
            };
        };

        'jsonLd:saveBlogOverrides': {
            request: {
                blogId: string;
                overrides: BlogJsonLdOverrides;
            };
            response: {
                code: 0 | -1;
                message: string;
                payload: {
                    success: boolean;
                };
            };
        };

        'jsonLd:generatePreview': {
            request: {
                blogId: string;
                overrides: BlogJsonLdOverrides;
            };
            response: {
                code: 0 | -1;
                message: string;
                payload: {
                    jsonLd: JsonLdOutput | JsonLdOutput[] | null;
                    validation: ValidationResult;
                };
            };
        };

        'jsonLd:getBlogJsonLd': {
            request: {
                blogId: string;
            };
            response: {
                code: 0 | -1;
                message: string;
                payload: {
                    jsonLd: JsonLdOutput | JsonLdOutput[] | null;
                };
            };
        };

        'jsonLd:regenerateCache': {
            request: {
                blogIds?: string[];
            };
            response: {
                code: 0 | -1;
                message: string;
                payload: {
                    success: number;
                    failed: number;
                    errors: string[];
                };
            };
        };

        'jsonLd:validateAll': {
            request: {};
            response: {
                code: 0 | -1;
                message: string;
                payload: {
                    valid: number;
                    invalid: number;
                    warnings: number;
                    issues: Array<{
                        blogId: string;
                        title: string;
                        errors: ValidationResult['errors'];
                        warnings: ValidationResult['warnings'];
                    }>;
                };
            };
        };
    }
}