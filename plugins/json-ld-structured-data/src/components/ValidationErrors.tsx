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
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <h4 className="text-sm font-medium text-red-800 mb-2">Validation Errors:</h4>
            <ul className="text-xs text-red-700 list-none m-0 p-0">
                {errors.map((error, index) => (
                    <li
                        key={index.toString()}
                        className="mb-1"
                    >
                        • {error.field}: {error.message}
                    </li>
                ))}
            </ul>
        </div>
    );
}