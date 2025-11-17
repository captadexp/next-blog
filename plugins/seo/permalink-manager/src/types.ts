import type {RPCMethods} from '@supergrowthai/plugin-dev-kit'
//dont remove ts needs for better typing
type T = RPCMethods;

export const CONTENT_TYPES = ['posts', 'tags', 'categories', 'users'] as const;
export type PermalinkState = { permalink: string; pattern: string; }

export type ContentType = typeof CONTENT_TYPES[number]
export type Section = { formats?: string[]; activeFormat?: string };
export type Settings = Partial<Record<ContentType, Section>>;
export type NormalizedSection = { formats: string[]; activeFormat: string };
export type NormalizedSettings = Record<ContentType, NormalizedSection>;

type ItemRequestPayload = { type: ContentType, _id: string }

// Augment the RPCMethods interface from @supergrowthai/types
// Note: The SDK's callRPC already wraps responses in {code, message, payload}
// So RPCMethods[T]['response'] should just be the payload type
declare module '@supergrowthai/plugin-dev-kit' {
    interface RPCMethods {
        'permalink:get': {
            request: ItemRequestPayload;
            response: { code: number; message: string; payload?: { state: PermalinkState } };
        };
        'permalink:set': {
            request: ItemRequestPayload & { state: PermalinkState },
            response: { code: number; message: string; payload?: { state: PermalinkState } };
        };

        'permalink:settings:get': {
            request: {};
            response: {
                code: number;
                message: string;
                payload?: {
                    posts: NormalizedSection;
                    tags: NormalizedSection;
                    categories: NormalizedSection;
                    users: NormalizedSection;
                }
            };
        };
        'permalink:settings:set': {
            request: {
                posts?: Partial<NormalizedSection>;
                tags?: Partial<NormalizedSection>;
                categories?: Partial<NormalizedSection>;
                users?: Partial<NormalizedSection>;
            };
            response: {
                code: number;
                message: string;
                payload?: {
                    posts: NormalizedSection;
                    tags: NormalizedSection;
                    categories: NormalizedSection;
                    users: NormalizedSection;
                }
            };
        };
    }
}