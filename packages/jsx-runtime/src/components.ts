import {JSX_ELEMENT, VNode} from './types';

const CARD_SYMBOL = Symbol.for('secure.jsx.Card');
const BUTTON_SYMBOL = Symbol.for('secure.jsx.Button');
const TEXT_SYMBOL = Symbol.for('secure.jsx.Text');

export function Card(props: any): VNode {
    return {
        $$typeof: JSX_ELEMENT,
        type: CARD_SYMBOL,
        props: props || {},
        key: props?.key ?? null
    };
}

export function Button(props: any): VNode {
    return {
        $$typeof: JSX_ELEMENT,
        type: BUTTON_SYMBOL,
        props: props || {},
        key: props?.key ?? null
    };
}

export function Text(props: any): VNode {
    return {
        $$typeof: JSX_ELEMENT,
        type: TEXT_SYMBOL,
        props: props || {},
        key: props?.key ?? null
    };
}

export {CARD_SYMBOL, BUTTON_SYMBOL, TEXT_SYMBOL};