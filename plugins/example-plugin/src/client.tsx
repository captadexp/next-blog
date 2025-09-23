import React, {useEffect, useState} from 'react';
import type {ClientContext} from '@supergrowthai/plugin-dev-kit';

interface WidgetProps {
    context: ClientContext;
    slot: string;
}

const ExampleWidget: React.FC<WidgetProps> = ({context, slot}) => {
    const [count, setCount] = useState(0);
    const [savedCount, setSavedCount] = useState<number | null>(null);

    useEffect(() => {
        context.api.storage.get('count').then(value => {
            if (value !== null) {
                setSavedCount(value);
            }
        });
    }, [context]);

    const handleSave = async () => {
        await context.api.storage.set('count', count);
        setSavedCount(count);
        context.ui.showToast('Count saved!', 'success');
    };

    const styles: React.CSSProperties = {
        padding: '1rem',
        borderRadius: '0.5rem',
        backgroundColor: '#f3f4f6',
        marginBottom: '1rem',
    };

    const buttonStyles: React.CSSProperties = {
        padding: '0.5rem 1rem',
        marginRight: '0.5rem',
        borderRadius: '0.25rem',
        border: 'none',
        backgroundColor: '#3b82f6',
        color: 'white',
        cursor: 'pointer',
    };

    return (
        <div style={styles}>
            <h3>Example Plugin - {slot}</h3>
            <p>Plugin ID: {context.id} v{context.version}</p>
            <p>Theme: {context.config.theme || 'auto'}</p>

            <div style={{marginTop: '1rem'}}>
                <p>Counter: {count}</p>
                {savedCount !== null && <p>Saved value: {savedCount}</p>}

                <button
                    style={buttonStyles}
                    onClick={() => setCount(count + 1)}
                >
                    Increment
                </button>

                <button
                    style={buttonStyles}
                    onClick={handleSave}
                >
                    Save to Storage
                </button>

                <button
                    style={{...buttonStyles, backgroundColor: '#ef4444'}}
                    onClick={() => setCount(0)}
                >
                    Reset
                </button>
            </div>
        </div>
    );
};

export default function render(props: WidgetProps) {
    return <ExampleWidget {...props} />;
}