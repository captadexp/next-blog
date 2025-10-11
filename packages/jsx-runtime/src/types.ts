/// <reference path="./global.d.ts" />


import {ClientSDKUtils} from "@supergrowthai/types";

export interface PluginRuntime {
    Fragment: symbol;
    utils: ClientSDKUtils;

    jsx(type: any, props: any, key?: any): JSX.Node;

    jsxs(type: any, props: any, key?: any): JSX.Node;

    jsxDEV(type: any, props: any, key?: any): JSX.Node;
}

declare global {
    interface Window {
        PluginRuntime: PluginRuntime;
    }
}