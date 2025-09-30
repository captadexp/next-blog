interface PluginRuntime {
    jsx: (type: any, props?: any, ...children: any[]) => any;
    jsxs: (type: any, props?: any, ...children: any[]) => any;
    jsxDEV: (type: any, props?: any, ...children: any[]) => any;
    Fragment: any;
    Card: (props?: any) => any;
    Button: (props?: any) => any;
    Text: (props?: any) => any;
    utils: {
        classList(...classes: (string | undefined | false)[]): string;
        styles(styleObject: Record<string, string | number>): string;
        debounce<T extends (...args: any[]) => any>(func: T, delay: number): T;
        throttle<T extends (...args: any[]) => any>(func: T, delay: number): T;
        formatDate(date: Date | string | number, format?: string): string;
        formatNumber(num: number, options?: Intl.NumberFormatOptions): string;
    };
}

declare global {
    interface Window {
        PluginRuntime: PluginRuntime;
    }
}

export {};