import {INTENT_TYPES} from '@supergrowthai/types';
import {IntentRegistration} from '../intent-registry';
import {ImageSelector} from '../components/ImageSelector';

export const ImageSelectorRegistration: IntentRegistration = {
    intentType: INTENT_TYPES.SELECT_IMAGE,
    component: ImageSelector,
    launch: 'replace' // Only one image selector at a time
};