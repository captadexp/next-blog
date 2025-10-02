// Export the server components
export {default as DashboardPage} from './server/DashboardPage';
export {default as NotFoundPage} from './server/NotFoundPage';

// Export hooks registry for plugin developers
export {HOOKS, ZONES, SLOTS, EVENTS} from './plugins/hooks.js';
export type {ZoneName, SlotName, EventName, HookName} from './plugins/hooks.js';
