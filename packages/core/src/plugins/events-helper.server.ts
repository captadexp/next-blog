import type {PluginEvents} from '@supergrowthai/next-blog-types/server';
import {EventEmitter} from 'events';

// Global event emitter for all plugins
const globalEmitter = new EventEmitter();
globalEmitter.setMaxListeners(100); // Increase limit for multiple plugins

/**
 * Server-side events helper for plugins with automatic fingerprinting
 */
export class ServerEventsHelper implements PluginEvents {
    private localEmitter: EventEmitter;

    constructor(private readonly pluginId: string) {
        this.localEmitter = new EventEmitter();
    }

    /**
     * Emit an event (automatically scoped to plugin)
     */
    async emit(event: string, data?: any): Promise<void> {
        const scopedEvent = this.getScopedEvent(event);

        // Emit locally
        this.localEmitter.emit(event, data);

        // Emit globally with scoped name
        globalEmitter.emit(scopedEvent, {
            pluginId: this.pluginId,
            event,
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Listen to events from this plugin
     */
    on(event: string, handler: (data: any) => void): void {
        this.localEmitter.on(event, handler);
    }

    /**
     * Listen to events from any plugin
     */
    onGlobal(event: string, handler: (data: any) => void): void {
        // If event already includes plugin prefix, use as-is
        if (event.startsWith('plugin:')) {
            globalEmitter.on(event, handler);
        } else {
            // Listen to this event from all plugins
            globalEmitter.on(`plugin:*:${event}`, handler);
        }
    }

    /**
     * Remove event listener
     */
    off(event: string, handler?: (data: any) => void): void {
        if (handler) {
            this.localEmitter.off(event, handler);
        } else {
            this.localEmitter.removeAllListeners(event);
        }
    }

    /**
     * Listen once
     */
    once(event: string, handler: (data: any) => void): void {
        this.localEmitter.once(event, handler);
    }

    /**
     * Clean up all listeners for this plugin
     */
    cleanup(): void {
        this.localEmitter.removeAllListeners();

        // Remove global listeners for this plugin
        const scopedPrefix = `plugin:${this.pluginId}:`;
        for (const event of globalEmitter.eventNames()) {
            if (typeof event === 'string' && event.startsWith(scopedPrefix)) {
                globalEmitter.removeAllListeners(event);
            }
        }
    }

    /**
     * Generate an event name with plugin fingerprint
     */
    private getScopedEvent(event: string): string {
        return `plugin:${this.pluginId}:${event}`;
    }
}