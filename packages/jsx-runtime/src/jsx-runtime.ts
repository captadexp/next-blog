/// <reference path="./global.d.ts" />
import {JSX_ELEMENT, VNode} from './types';

export function jsx(type: any, props: any, ...childrenRaw: any[]): VNode {
    const children = childrenRaw.flat();

    if (typeof type === 'function') {
        const fullProps = {
            ...props,
            children: children.length === 1 ? children[0] : children.length > 1 ? children : undefined
        };
        return type(fullProps);
    }

    return {
        $$typeof: JSX_ELEMENT,
        type,
        props: {
            ...(props || {}),
            children: children.length === 1 ? children[0] : children.length > 1 ? children : undefined
        },
        key: props?.key ?? null
    };
}

export function jsxs(type: any, props: any, ...children: any[]): VNode {
    return jsx(type, props, ...children);
}

export function jsxDEV(type: any, props: any, ...children: any[]): VNode {
    return jsx(type, props, ...children);
}

export {JSX_FRAGMENT as Fragment} from './types';