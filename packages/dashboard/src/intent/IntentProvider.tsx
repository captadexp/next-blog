import {createContext, h} from 'preact';
import {useCallback, useContext, useEffect, useState} from 'preact/hooks';
import {IntentRequest, IntentResponse} from '@supergrowthai/types';
import {intentRegistry} from './intent-registry';

interface IntentContextType {
    startIntent: <T, R>(intentType: string, payload: T) => Promise<R>;
}

const IntentContext = createContext<IntentContextType | undefined>(undefined);

export const IntentProvider = ({children}: { children: any }) => {
    const [activeIntents, setActiveIntents] = useState<IntentRequest[]>([]);

    useEffect(() => {
        const handleIntentRequest = (event: Event) => {
            const customEvent = event as CustomEvent<IntentRequest>;
            const request = customEvent.detail;

            // Get the registration for this intent type
            const registration = intentRegistry.get(request.intentType);
            if (!registration) {
                // Send error response on request-specific channel
                const errorResponse: IntentResponse = {
                    requestId: request.requestId,
                    intentType: request.intentType,
                    success: false,
                    error: `No handler registered for intent type: ${request.intentType}`
                };

                window.dispatchEvent(new CustomEvent(`intent:response:${request.requestId}`, {
                    detail: errorResponse,
                    bubbles: true
                }));
                return;
            }

            // Handle launch mode
            const launch = registration.launch || 'replace';

            setActiveIntents(prev => {
                if (launch === 'replace') {
                    // Replace any existing intents of the same type
                    const filtered = prev.filter(i => i.intentType !== request.intentType);
                    return [...filtered, request];
                } else {
                    // Stack mode - just add it
                    return [...prev, request];
                }
            });
        };

        window.addEventListener('intent:request', handleIntentRequest);
        return () => window.removeEventListener('intent:request', handleIntentRequest);
    }, []);

    const startIntent = useCallback(<T, R>(intentType: string, payload: T): Promise<R> => {
        return new Promise((resolve, reject) => {
            const requestId = `${intentType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

            const handleResponse = (event: Event) => {
                const customEvent = event as CustomEvent<IntentResponse>;
                const response = customEvent.detail;
                cleanup();

                if (response.success) {
                    resolve(response.payload as R);
                } else if (response.cancelled) {
                    resolve(null as R);
                } else {
                    reject(new Error(response.error || 'Intent failed'));
                }
            };

            const cleanup = () => {
                window.removeEventListener(`intent:response:${requestId}`, handleResponse);
                clearTimeout(timeoutId);
            };

            const timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error('Intent timeout'));
            }, 60000);

            // Listen for request-specific response
            window.addEventListener(`intent:response:${requestId}`, handleResponse);

            // Dispatch intent request
            window.dispatchEvent(new CustomEvent('intent:request', {
                detail: {requestId, intentType, payload},
                bubbles: true
            }));
        });
    }, []);

    // Create a way to notify provider when intents complete
    useEffect(() => {
        // Store this function globally so components can call it
        (window as any).__removeIntent = (requestId: string) => {
            setActiveIntents(prev => prev.filter(i => i.requestId !== requestId));
        };

        return () => {
            delete (window as any).__removeIntent;
        };
    }, []);

    return (
        <IntentContext.Provider value={{startIntent}}>
            {children}
            {/* Render active intent UIs */}
            {activeIntents.map(intent => {
                const registration = intentRegistry.get(intent.intentType);
                if (!registration?.component) return null;

                const Component = registration.component;
                return <Component key={intent.requestId} request={intent}/>;
            })}
        </IntentContext.Provider>
    );
};

export const useIntent = () => {
    const context = useContext(IntentContext);
    if (!context) {
        throw new Error('useIntent must be used within an IntentProvider');
    }
    return context;
};