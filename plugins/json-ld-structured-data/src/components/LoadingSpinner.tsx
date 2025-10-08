

interface LoadingSpinnerProps {
    message?: string;
}

export function LoadingSpinner({ message = 'Loading JSON-LD settings...' }: LoadingSpinnerProps) {
    return (
        <div style={{
            padding: '1rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            backgroundColor: 'white'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: '2rem',
                paddingBottom: '2rem'
            }}>
                <div style={{
                    width: '1.5rem',
                    height: '1.5rem',
                    border: '2px solid #3b82f6',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginRight: '0.75rem'
                }}></div>
                <span style={{color: '#4b5563'}}>{message}</span>
            </div>
        </div>
    );
}