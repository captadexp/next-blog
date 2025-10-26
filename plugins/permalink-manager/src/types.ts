import type {RPCMethods} from '@supergrowthai/plugin-dev-kit'

// Augment the RPCMethods interface from @supergrowthai/types
// Note: The SDK's callRPC already wraps responses in {code, message, payload}
// So RPCMethods[T]['response'] should just be the payload type
export interface PermalinkState {
    permalink: string;
    pattern: string;
}

type T = RPCMethods;

declare module '@supergrowthai/plugin-dev-kit' {
    interface RPCMethods {
        'permalink:get': {
            request: { blogId: string };
            response: { code: number; message: string; payload?: { state: PermalinkState } };
        };
        'permalink:set': {
            request: {
                blogId: string;
                state: PermalinkState;
            };
            response: { code: number; message: string; payload?: { state: PermalinkState } };
        };
        'permalink:settings:get': {
            request: {};
            response: { code: number; message: string; payload?: { formats: string[]; activeFormat: string } };
        };
        'permalink:settings:set': {
            request: {
                formats?: string[];
                activeFormat?: string;
            };
            response: { code: number; message: string; payload?: { formats: string[]; activeFormat: string } };
        };
    }
}