export * from './intent/base.js';
export * from './intent/image.js';

export const INTENT_TYPES = {
    SELECT_IMAGE: 'select-image',
    // Future intent types:
    // SHOW_MODAL: 'show-modal',
    // SHOW_DIALOG: 'show-dialog',
    // FILE_PICKER: 'file-picker',
} as const;

export type IntentType = typeof INTENT_TYPES[keyof typeof INTENT_TYPES];