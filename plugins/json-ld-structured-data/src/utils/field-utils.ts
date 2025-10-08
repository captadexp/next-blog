import type {MergeContext} from '../types/plugin-types.js';

/**
 * Get field value with override precedence
 */
export function getFieldValue(field: string, context: MergeContext): any {
    const {overrides} = context;

    // Check if field is overridden
    if (overrides.overrides?.[field] && overrides.custom?.[field] !== undefined) {
        return overrides.custom[field];
    }

    // Return undefined to use auto-derived values
    return undefined;
}