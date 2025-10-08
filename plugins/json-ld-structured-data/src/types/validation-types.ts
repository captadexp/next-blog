// Validation types for JSON-LD output

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    field: string;
    message: string;
    code?: string;
}

export interface ValidationWarning {
    field: string;
    message: string;
    suggestion?: string;
}