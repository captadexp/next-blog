import {ClientSDK} from '@supergrowthai/plugin-dev-kit/client';

interface JsonPreviewProps {
    jsonPreview: string;
    sdk: ClientSDK;
}

export function JsonPreview({ jsonPreview, sdk }: JsonPreviewProps) {
    const handleCopy = () => {
        navigator.clipboard.writeText(jsonPreview);
        sdk.notify('JSON-LD copied to clipboard', 'success');
    };

    return (
        <div style={{marginBottom: '1.5rem'}}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem'
            }}>
                <h4 style={{
                    fontSize: '0.875rem',
                    fontWeight: '500'
                }}>JSON-LD Preview</h4>
                <button
                    onClick={handleCopy}
                    style={{
                        paddingLeft: '0.5rem',
                        paddingRight: '0.5rem',
                        paddingTop: '0.25rem',
                        paddingBottom: '0.25rem',
                        fontSize: '0.75rem',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '0.25rem',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                >
                    Copy
                </button>
            </div>
            <pre style={{
                backgroundColor: '#f9fafb',
                padding: '0.75rem',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                overflowX: 'auto',
                maxHeight: '16rem',
                margin: 0,
                border: '1px solid #e5e7eb'
            }}>
                {jsonPreview || 'Generating preview...'}
            </pre>
        </div>
    );
}