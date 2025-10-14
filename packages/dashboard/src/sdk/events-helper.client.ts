import type {PluginEvents} from '@supergrowthai/next-blog-types/client';

type EventHandler = (data: any) => void;

interface EventListener {
    event: string;
    handler: EventHandler;
    once: boolean;
}

// Global event bus for cross-plugin communication
class GlobalEventBus {
    private listeners = new Map<string, Set<EventHandler>>();

    emit(event: string, data: any): void {
        const handlers = this.listeners.get(event);
        if (handlers) {
            handlers.forEach(handler => handler(data));
        }

        // Also check for wildcard listeners
        const wildcardEvent = event.replace(/^plugin:[^:]+:/, 'plugin:*:');
        const wildcardHandlers = this.listeners.get(wildcardEvent);
        if (wildcardHandlers) {
            wildcardHandlers.forEach(handler => handler(data));
        }
    }

    on(event: string, handler: EventHandler): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(handler);
    }

    off(event: string, handler?: EventHandler): void {
        if (!handler) {
            this.listeners.delete(event);
        } else {
            const handlers = this.listeners.get(event);
            if (handlers) {
                handlers.delete(handler);
                if (handlers.size === 0) {
                    this.listeners.delete(event);
                }
            }
        }
    }
}

const globalBus = new GlobalEventBus();

/**
 * Client-side events helper with automatic plugin fingerprinting
 */
export class ClientEventsHelper implements PluginEvents {
    private localListeners: EventListener[] = [];
    private globalListeners: Map<string, EventHandler> = new Map();

    constructor(private readonly pluginId: string) {
    }

    /**
     * Emit an event (automatically scoped to plugin)
     */
    async emit(event: string, data?: any): Promise<void> {
        // Emit to local listeners
        const localHandlers = this.localListeners
            .filter(l => l.event === event);

        for (const listener of localHandlers) {
            listener.handler(data);
            if (listener.once) {
                const index = this.localListeners.indexOf(listener);
                this.localListeners.splice(index, 1);
            }
        }

        // Emit globally with scoped name
        const scopedEvent = this.getScopedEvent(event);
        globalBus.emit(scopedEvent, {
            pluginId: this.pluginId,
            event,
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Listen to events from this plugin
     */
    on(event: string, handler: EventHandler): void {
        this.localListeners.push({
            event,
            handler,
            once: false
        });
    }

    /**
     * Listen to events from any plugin
     */
    onGlobal(event: string, handler: EventHandler): void {
        // If event already includes plugin prefix, use as-is
        const globalEvent = event.startsWith('plugin:')
            ? event
            : `plugin:*:${event}`;

        globalBus.on(globalEvent, handler);
        this.globalListeners.set(globalEvent, handler);
    }

    /**
     * Remove event listener
     */
    off(event: string, handler?: EventHandler): void {
        if (!handler) {
            // Remove all local listeners for this event
            this.localListeners = this.localListeners
                .filter(l => l.event !== event);
        } else {
            // Remove specific local listener
            this.localListeners = this.localListeners
                .filter(l => !(l.event === event && l.handler === handler));
        }
    }

    /**
     * Listen once
     */
    once(event: string, handler: EventHandler): void {
        this.localListeners.push({
            event,
            handler,
            once: true
        });
    }

    /**
     * Clean up all listeners
     */
    cleanup(): void {
        this.localListeners = [];

        // Remove global listeners
        for (const [event, handler] of this.globalListeners.entries()) {
            globalBus.off(event, handler);
        }
        this.globalListeners.clear();
    }

    /**
     * Generate an event name with plugin fingerprint
     */
    private getScopedEvent(event: string): string {
        return `plugin:${this.pluginId}:${event}`;
    }
}