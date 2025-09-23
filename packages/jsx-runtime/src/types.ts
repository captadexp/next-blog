export const JSX_ELEMENT = Symbol.for('secure.jsx.element');
export const JSX_FRAGMENT = Symbol.for('secure.jsx.fragment');

export interface VNode {
    $$typeof: symbol;
    type: string | symbol | Function;
    props: Record<string, any>;
    key: string | number | null;
}

export interface PluginUtils {
    classList(...classes: (string | undefined | null | false)[]): string;

    styles(styles: Record<string, string | number>): string;

    debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T;

    throttle<T extends (...args: any[]) => any>(fn: T, delay: number): T;

    formatDate(date: Date | string | number, format?: string): string;

    formatNumber(num: number, options?: Intl.NumberFormatOptions): string;
}

export interface PluginRuntime {
    Fragment: symbol;
    utils: PluginUtils;

    jsx(type: any, props: any, key?: any): VNode;

    jsxs(type: any, props: any, key?: any): VNode;

    jsxDEV(type: any, props: any, key?: any): VNode;

    Card(props: any): any;

    Button(props: any): any;

    Text(props: any): any;
}

declare global {
    interface Window {
        PluginRuntime: PluginRuntime;
    }
}