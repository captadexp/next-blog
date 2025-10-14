import {IntentConfig, IntentRequest} from '@supergrowthai/next-blog-types';
import {ComponentType} from 'preact';

export interface IntentRegistration extends IntentConfig {
    component: ComponentType<{ request: IntentRequest }>;
}

class IntentRegistry {
    private handlers = new Map<string, IntentRegistration>();

    register(registration: IntentRegistration) {
        this.handlers.set(registration.intentType, registration);
    }

    get(intentType: string): IntentRegistration | undefined {
        return this.handlers.get(intentType);
    }

    has(intentType: string): boolean {
        return this.handlers.has(intentType);
    }
}

export const intentRegistry = new IntentRegistry();