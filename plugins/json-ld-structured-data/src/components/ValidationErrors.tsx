interface ValidationError {
    field: string;
    message: string;
}

interface ValidationErrorsProps {
    errors: ValidationError[];
}

export function ValidationErrors({errors}: ValidationErrorsProps) {
    if (errors.length === 0) {
        return null;
    }

    return (
        <div style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.25rem'
        }}>
            <h4 style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#991b1b',
                marginBottom: '0.5rem'
            }}>Validation Errors:</h4>
            <ul style={{
                fontSize: '0.75rem',
                color: '#b91c1c',
                listStyle: 'none',
                margin: 0,
                padding: 0
            }}>
                {errors.map((error, index) => (
                    <li
                        key={index.toString()}
                        style={{marginBottom: '0.25rem'}}
                    >
                        • {error.field}: {error.message}
                    </li>
                ))}
            </ul>
        </div>
    );
}