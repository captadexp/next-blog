/// <reference path="./global.d.ts" />


import {ClientSDKUtils} from "@supergrowthai/next-blog-types";

export interface PluginRuntime {
    Fragment: symbol;
    utils: ClientSDKUtils;

    jsx(type: any, props: any, key?: any): JSX.Node;

    jsxs(type: any, props: any, key?: any): JSX.Node;

    jsxDEV(type: any, props: any, key?: any): JSX.Node;

    // React/Preact hooks from the host
    useState: <T>(initialState: T | (() => T)) => [T, (value: T | ((prev: T) => T)) => void];
    useEffect: (effect: () => void | (() => void), deps?: any[]) => void;
    useMemo: <T>(factory: () => T, deps?: any[]) => T;
    useCallback: <T extends (...args: any[]) => any>(callback: T, deps?: any[]) => T;
    useRef: <T>(initialValue?: T) => { current: T | undefined };
    useContext: <T>(context: any) => T;
    useReducer: <S, A>(reducer: (state: S, action: A) => S, initialState: S) => [S, (action: A) => void];
    useLayoutEffect: (effect: () => void | (() => void), deps?: any[]) => void;
}

declare global {
    interface Window {
        PluginRuntime: PluginRuntime;
    }
}