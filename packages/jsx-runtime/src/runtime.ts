import {PluginUtils} from './types';
import {Button, Card, Text} from './components';
// Use the jsx functions from jsx-runtime.ts to avoid duplication
import {Fragment, jsx, jsxDEV, jsxs} from './jsx-runtime';

const utils: PluginUtils = {
    classList(...classes) {
        return classes.filter(Boolean).join(' ');
    },

    styles(styles) {
        return Object.entries(styles)
            .map(([key, value]) => {
                const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                return `${cssKey}: ${typeof value === 'number' ? `${value}px` : value}`;
            })
            .join('; ');
    },

    debounce(fn, delay) {
        let timeoutId: any;
        return ((...args: any[]) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn(...args), delay);
        }) as any;
    },

    throttle(fn, delay) {
        let lastCall = 0;
        let timeoutId: any;
        return ((...args: any[]) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                fn(...args);
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    lastCall = Date.now();
                    fn(...args);
                }, delay - (now - lastCall));
            }
        }) as any;
    },

    formatDate(date, format = 'MM/DD/YYYY') {
        const d = date instanceof Date ? date : new Date(date);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');

        return format
            .replace('MM', month)
            .replace('DD', day)
            .replace('YYYY', String(year))
            .replace('YY', String(year).slice(-2))
            .replace('HH', hours)
            .replace('mm', minutes);
    },

    formatNumber(num, options = {}) {
        return new Intl.NumberFormat('en-US', options).format(num);
    }
};

// Re-export everything needed for the runtime
export {jsx, jsxs, jsxDEV, Fragment, Card, Button, Text, utils};