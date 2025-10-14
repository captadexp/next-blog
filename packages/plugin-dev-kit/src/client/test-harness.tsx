import {ClientSDK} from './index';
import {createMockClientSDK} from './mock-sdk';
import {Fragment} from './jsx-runtime';
import {ClientPluginModule} from "@supergrowthai/next-blog-types";

export interface TestOptions {
    hook: string;
    sdk?: ClientSDK;
    context?: Record<string, any>;
    render?: boolean;
}

export function testClientPlugin(plugin: ClientPluginModule, options: TestOptions) {
    const {hook, context = {}, render = false} = options;
    const sdk = options.sdk || createMockClientSDK();

    console.group(`Testing Client Plugin: ${sdk.pluginId}`);
    console.log('Hook:', hook);
    console.log('Context:', context);

    const hookFn = plugin.hooks?.[hook];
    if (!hookFn) {
        console.error(`Hook "${hook}" not found in plugin`);
        console.log('Available hooks:', plugin.hooks ? Object.keys(plugin.hooks) : 'No hooks defined');
        console.groupEnd();
        return null;
    }

    try {
        const result = hookFn(sdk, context);
        console.log('Result:', result);

        if (render && result) {
            renderVNode(result);
        }

        console.groupEnd();
        return result;
    } catch (error) {
        console.error('Error executing hook:', error);
        console.groupEnd();
        throw error;
    }
}

function renderVNode(vnode: any, depth = 0) {
    const indent = '  '.repeat(depth);

    if (!vnode) {
        console.log(indent + 'null');
        return;
    }

    if (typeof vnode === 'string' || typeof vnode === 'number') {
        console.log(indent + vnode);
        return;
    }

    if (vnode.$$typeof === Symbol.for('secure.jsx.element')) {
        const type = vnode.type === Fragment ? 'Fragment' : vnode.type;
        const {children, ...props} = vnode.props;

        console.log(indent + `<${type}${formatProps(props)}>`);

        if (children) {
            if (Array.isArray(children)) {
                children.forEach(child => renderVNode(child, depth + 1));
            } else {
                renderVNode(children, depth + 1);
            }
        }

        console.log(indent + `</${type}>`);
    }
}

function formatProps(props: Record<string, any>): string {
    const entries = Object.entries(props);
    if (entries.length === 0) return '';

    return ' ' + entries
        .map(([key, value]) => {
            if (typeof value === 'function') return `${key}={fn}`;
            if (typeof value === 'string') return `${key}="${value}"`;
            return `${key}={${JSON.stringify(value)}}`;
        })
        .join(' ');
}