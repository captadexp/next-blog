declare global {
    interface Window {
        PluginRuntime?: {
            useState?: <T>(initialState: T | (() => T)) => [T, (value: T | ((prev: T) => T)) => void];
            useEffect?: (effect: () => void | (() => void), deps?: any[]) => void;
            useMemo?: <T>(factory: () => T, deps?: any[]) => T;
            useCallback?: <T extends (...args: any[]) => any>(callback: T, deps?: any[]) => T;
            useRef?: <T>(initialValue?: T) => { current: T | undefined };
            useContext?: <T>(context: any) => T;
            useReducer?: <S, A>(reducer: (state: S, action: A) => S, initialState: S) => [S, (action: A) => void];
            useLayoutEffect?: (effect: () => void | (() => void), deps?: any[]) => void;
        };
    }
}


// Export hooks that proxy to the host's React/Preact instance
export const useState = <T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void] => {
    if (!window.PluginRuntime?.useState) {
        throw new Error('useState is not available. Make sure the plugin is loaded in a host environment.');
    }
    return window.PluginRuntime.useState(initialState);
};

export const useEffect = (effect: () => void | (() => void), deps?: any[]): void => {
    if (!window.PluginRuntime?.useEffect) {
        throw new Error('useEffect is not available. Make sure the plugin is loaded in a host environment.');
    }
    return window.PluginRuntime.useEffect(effect, deps);
};

export const useMemo = <T>(factory: () => T, deps?: any[]): T => {
    if (!window.PluginRuntime?.useMemo) {
        throw new Error('useMemo is not available. Make sure the plugin is loaded in a host environment.');
    }
    return window.PluginRuntime.useMemo(factory, deps);
};

export const useCallback = <T extends (...args: any[]) => any>(callback: T, deps?: any[]): T => {
    if (!window.PluginRuntime?.useCallback) {
        throw new Error('useCallback is not available. Make sure the plugin is loaded in a host environment.');
    }
    return window.PluginRuntime.useCallback(callback, deps);
};

export const useRef = <T>(initialValue?: T): { current: T | undefined } => {
    if (!window.PluginRuntime?.useRef) {
        throw new Error('useRef is not available. Make sure the plugin is loaded in a host environment.');
    }
    return window.PluginRuntime.useRef(initialValue);
};

export const useContext = <T>(context: any): T => {
    if (!window.PluginRuntime?.useContext) {
        throw new Error('useContext is not available. Make sure the plugin is loaded in a host environment.');
    }
    return window.PluginRuntime.useContext(context);
};

export const useReducer = <S, A>(reducer: (state: S, action: A) => S, initialState: S): [S, (action: A) => void] => {
    if (!window.PluginRuntime?.useReducer) {
        throw new Error('useReducer is not available. Make sure the plugin is loaded in a host environment.');
    }
    return window.PluginRuntime.useReducer(reducer, initialState);
};

export const useLayoutEffect = (effect: () => void | (() => void), deps?: any[]): void => {
    if (!window.PluginRuntime?.useLayoutEffect) {
        throw new Error('useLayoutEffect is not available. Make sure the plugin is loaded in a host environment.');
    }
    return window.PluginRuntime.useLayoutEffect(effect, deps);
};