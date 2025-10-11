// Whitelist of allowed native elements
const ALLOWED_NATIVE_ELEMENTS = [
    // Structural elements
    'div', 'span', 'section', 'article', 'nav', 'header', 'footer', 'main', 'aside',
    // Text elements
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'blockquote', 'pre', 'code', 'em', 'strong', 'small', 'mark', 'del', 'ins', 'sub', 'sup',
    // Interactive elements
    'button', 'a', 'input', 'textarea', 'select', 'option', 'optgroup',
    // Table elements
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col',
    // Form elements
    'form', 'label', 'fieldset', 'legend',
    // Media elements
    'img', 'audio', 'video', 'canvas',
    // Other common elements
    'br', 'hr', 'details', 'summary', 'dialog'
];

// Whitelist of allowed props for native elements  
const ALLOWED_PROPS = [
    'key',
    // Common attributes
    'className', 'class', 'id', 'style', 'title', 'role', 'tabIndex',
    // Interactive attributes
    'onClick', 'onChange', 'onSubmit', 'onFocus', 'onBlur',
    'onKeyDown', 'onKeyUp', 'onKeyPress',
    'onMouseDown', 'onMouseUp', 'onMouseEnter', 'onMouseLeave', 'onMouseOver', 'onMouseOut',
    // Form attributes
    'type', 'value', 'defaultValue', 'checked', 'defaultChecked',
    'placeholder', 'name', 'disabled', 'readOnly', 'required',
    'min', 'max', 'step', 'pattern', 'maxLength', 'minLength',
    'rows', 'cols', 'autoComplete', 'autoFocus',
    // Link attributes
    'href', 'target', 'rel', 'download',
    // Media attributes
    'src', 'alt', 'width', 'height', 'loading',
    // Accessibility
    'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden',
    'aria-expanded', 'aria-controls', 'aria-current',
    // Data attributes (handled with prefix)
    'data-*'
];

interface RenderContext {
    sdk?: any;
    context?: any;
    pluginId?: string;
}

/**
 * Creates a renderer function for the given framework
 * @param h - The framework's createElement function
 * @param Fragment - The framework's Fragment component
 */
export function createRenderer(h: any, Fragment: any) {
    /**
     * Renders a VNode tree to framework elements
     * Strict validation - only accepts proper VNodes with $$typeof
     */
    return function render(vnode: JSX.Node, ctx: RenderContext = {}): any {
        // Handle primitives and falsy values
        if (vnode === null || vnode === undefined || vnode === false || vnode === true) return null;
        if (typeof vnode === 'string' || typeof vnode === 'number') return String(vnode);
        if (typeof vnode === 'bigint') return String(vnode);

        // Handle iterables (arrays and other iterables)
        if (vnode && typeof vnode === 'object' && Symbol.iterator in vnode) {
            const items: JSX.Node[] = Array.from(vnode as Iterable<JSX.Node>);
            return items.map(item => render(item, ctx));
        }

        // Strict VNode validation - must be an object with $$typeof
        if (typeof vnode !== 'object') {
            console.error('Invalid VNode - not an object:', vnode);
            throw new Error(`Invalid VNode: expected object with $$typeof, got ${typeof vnode}`);
        }

        // At this point, vnode must be JSX.Element or JSX.Portal
        const elementOrPortal = vnode as JSX.Element | JSX.Portal;

        if (!elementOrPortal.$$typeof || elementOrPortal.$$typeof !== Symbol.for('secure.jsx.element')) {
            console.error('Invalid VNode - missing or invalid $$typeof:', elementOrPortal);
            throw new Error('Invalid VNode: must have $$typeof: Symbol.for("secure.jsx.element")');
        }

        // Extract VNode properties
        const {type, props = {}} = elementOrPortal;
        const {children, ...restProps} = props;

        // Handle Fragment
        if (type === Symbol.for('secure.jsx.fragment')) {
            const childArray = Array.isArray(children) ? children : children ? [children] : [];
            return h(Fragment, {}, ...childArray.map(child => render(child, ctx)));
        }

        // Handle function components
        if (typeof type === 'function') {
            // Call the function component with props to get its JSX
            const componentResult = type(props);
            // Recursively render the returned JSX
            return render(componentResult, ctx);
        }

        const childArray = Array.isArray(children) ? children : children ? [children] : [];
        // Handle native elements
        if (typeof type === 'string') {
            if (!ALLOWED_NATIVE_ELEMENTS.includes(type)) {
                throw new Error(`Element <${type}> is not allowed. Allowed elements: ${ALLOWED_NATIVE_ELEMENTS.join(', ')}`);
            }

            // Filter props for native elements
            const finalProps: any = {};
            for (const key in restProps) {
                // Check if key is in allowed props or is a data-* attribute
                if (ALLOWED_PROPS.includes(key) || key.startsWith('data-')) {
                    // Handle class/className normalization for Preact
                    if (key === 'className') {
                        finalProps['class'] = restProps[key];
                    } else if (key === 'class') {
                        finalProps['class'] = restProps[key];
                    } else {
                        finalProps[key] = restProps[key];
                    }
                } else {
                    console.warn(`[JSX Runtime] Prop "${key}" is not allowed on <${type}> element and was filtered out`);
                }
            }

            return h(type as any, finalProps, ...childArray.map(child => render(child, ctx)));
        }

        // Unknown element type
        throw new Error(`Unknown element type: ${String(type)}`);
    }
}