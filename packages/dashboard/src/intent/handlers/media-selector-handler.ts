import {INTENT_TYPES} from '@supergrowthai/next-blog-types';
import {IntentRegistration} from '../intent-registry';
import {MediaSelector} from '../components/MediaSelector';

export const MediaSelectorRegistration: IntentRegistration = {
    intentType: INTENT_TYPES.SELECT_MEDIA,
    component: MediaSelector,
    launch: 'replace' // Only one media selector at a time
};