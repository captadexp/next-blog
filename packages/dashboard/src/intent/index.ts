// Main entry point for intent system
export {IntentProvider, useIntent} from './IntentProvider';
export {intentRegistry} from './intent-registry';

// Import and register built-in intents
import {MediaSelectorRegistration} from './handlers/media-selector-handler';
import {intentRegistry} from './intent-registry';

// Register built-in intents
intentRegistry.register(MediaSelectorRegistration);