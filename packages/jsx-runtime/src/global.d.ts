declare global {
    namespace JSX {
        interface Element {
            $$typeof: symbol;
            type: string | symbol | ComponentType
            props: any;
            key: string | null;
        }

        interface Portal extends Element {
            children: Node
        }

        type Node = | Element
            | string
            | number
            | bigint
            | Iterable<Node>
            | Portal
            | boolean
            | null
            | undefined

        // Base props that all HTML elements can have
        interface HTMLAttributes {
            // Common attributes
            className?: string;
            class?: string;
            id?: string;
            style?: string | Record<string, string | number>;
            title?: string;
            role?: string;
            tabIndex?: number;

            // Event handlers
            onClick?: (event: any) => void;
            onChange?: (event: any) => void;
            onSubmit?: (event: any) => void;
            onFocus?: (event: any) => void;
            onBlur?: (event: any) => void;
            onKeyDown?: (event: any) => void;
            onKeyUp?: (event: any) => void;
            onKeyPress?: (event: any) => void;
            onMouseDown?: (event: any) => void;
            onMouseUp?: (event: any) => void;
            onMouseEnter?: (event: any) => void;
            onMouseLeave?: (event: any) => void;
            onMouseOver?: (event: any) => void;
            onMouseOut?: (event: any) => void;

            // Accessibility
            'aria-label'?: string;
            'aria-labelledby'?: string;
            'aria-describedby'?: string;
            'aria-hidden'?: boolean | 'true' | 'false';
            'aria-expanded'?: boolean | 'true' | 'false';
            'aria-controls'?: string;
            'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false';

            // Children
            children?: Node;
        }

        // Form-specific attributes
        interface FormAttributes extends HTMLAttributes {
            type?: string;
            value?: string | number;
            defaultValue?: string | number;
            checked?: boolean;
            defaultChecked?: boolean;
            placeholder?: string;
            name?: string;
            disabled?: boolean;
            readOnly?: boolean;
            required?: boolean;
            min?: string | number;
            max?: string | number;
            step?: string | number;
            pattern?: string;
            maxLength?: number;
            minLength?: number;
            rows?: number;
            cols?: number;
            autoComplete?: string;
            autoFocus?: boolean;
        }

        // Link-specific attributes
        interface AnchorAttributes extends HTMLAttributes {
            href?: string;
            target?: '_blank' | '_self' | '_parent' | '_top' | string;
            rel?: string;
            download?: boolean | string;
        }

        // Image/Media-specific attributes
        interface MediaAttributes extends HTMLAttributes {
            src?: string;
            alt?: string;
            width?: string | number;
            height?: string | number;
            loading?: 'lazy' | 'eager';
        }

        interface IntrinsicElements {
            // Structural elements
            div: HTMLAttributes;
            span: HTMLAttributes;
            section: HTMLAttributes;
            article: HTMLAttributes;
            nav: HTMLAttributes;
            header: HTMLAttributes;
            footer: HTMLAttributes;
            main: HTMLAttributes;
            aside: HTMLAttributes;

            // Text elements
            h1: HTMLAttributes;
            h2: HTMLAttributes;
            h3: HTMLAttributes;
            h4: HTMLAttributes;
            h5: HTMLAttributes;
            h6: HTMLAttributes;
            p: HTMLAttributes;
            ul: HTMLAttributes;
            ol: HTMLAttributes;
            li: HTMLAttributes;
            dl: HTMLAttributes;
            dt: HTMLAttributes;
            dd: HTMLAttributes;
            blockquote: HTMLAttributes;
            pre: HTMLAttributes;
            code: HTMLAttributes;
            em: HTMLAttributes;
            strong: HTMLAttributes;
            small: HTMLAttributes;
            mark: HTMLAttributes;
            del: HTMLAttributes;
            ins: HTMLAttributes;
            sub: HTMLAttributes;
            sup: HTMLAttributes;

            // Interactive elements
            button: FormAttributes;
            a: AnchorAttributes;
            input: FormAttributes;
            textarea: FormAttributes;
            select: FormAttributes;
            option: FormAttributes;
            optgroup: FormAttributes;

            // Table elements
            table: HTMLAttributes;
            thead: HTMLAttributes;
            tbody: HTMLAttributes;
            tfoot: HTMLAttributes;
            tr: HTMLAttributes;
            td: HTMLAttributes;
            th: HTMLAttributes;
            caption: HTMLAttributes;
            colgroup: HTMLAttributes;
            col: HTMLAttributes;

            // Form elements
            form: HTMLAttributes;
            label: HTMLAttributes;
            fieldset: HTMLAttributes;
            legend: HTMLAttributes;

            // Media elements
            img: MediaAttributes;
            audio: MediaAttributes;
            video: MediaAttributes;
            canvas: HTMLAttributes;

            // Other common elements (self-closing, no children)
            br: Omit<HTMLAttributes, 'children'>;
            hr: Omit<HTMLAttributes, 'children'>;
            details: HTMLAttributes;
            summary: HTMLAttributes;
            dialog: HTMLAttributes;
        }

    }

    type FunctionComponent<P = any> = (props?: P) => JSX.Node | null
    type FC<P = any> = FunctionComponent<P>
    type ComponentType<P = any> = FunctionComponent<P>

    namespace React {
        type Element = JSX.Element
        type IntrinsicElements = JSX.IntrinsicElements
    }

    type ReactNode = JSX.Node;
    type ReactElement = JSX.Element;
    type ReactPortal = JSX.Portal;
}

export {};