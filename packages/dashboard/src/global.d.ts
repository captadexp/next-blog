interface PluginRuntime {
    jsx: (type: any, props?: any, ...children: any[]) => any;
    jsxs: (type: any, props?: any, ...children: any[]) => any;
    jsxDEV: (type: any, props?: any, ...children: any[]) => any;
    Fragment: any;
    utils: {
        classList(...classes: (string | undefined | false)[]): string;
        styles(styleObject: Record<string, string | number>): string;
        debounce<T extends (...args: any[]) => any>(func: T, delay: number): T;
        throttle<T extends (...args: any[]) => any>(func: T, delay: number): T;
        formatDate(date: Date | string | number, format?: string): string;
        formatNumber(num: number, options?: Intl.NumberFormatOptions): string;
    };
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

export {};