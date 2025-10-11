// Client-side SDK for browser plugins
export {
    type ClientSDK,
    type APIClient,
    type Storage,
    type ClientPluginModule,
    type User,
    type APIResponse,
    type NotificationStatus
} from '@supergrowthai/types';

export {createMockClientSDK} from './mock-sdk';
export {testClientPlugin} from './test-harness';

// Re-export JSX runtime types for client-side only
export {
    jsx,
    jsxs,
    jsxDEV,
    Fragment
} from '@supergrowthai/jsx-runtime';

export {type PluginRuntime} from '@supergrowthai/jsx-runtime';

// Export React/Preact hooks from the host
export {
    useState,
    useEffect,
    useMemo,
    useCallback,
    useRef,
    useContext,
    useReducer,
    useLayoutEffect
} from './hooks';