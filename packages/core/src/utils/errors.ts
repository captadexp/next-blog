import {Exception} from "@supergrowthai/oneapi/errors";

export {Exception}

/**
 * Error for bad requests - invalid input, validation failures, etc.
 * Status code: 400
 */
export class BadRequest extends Exception {
    constructor(message: string, code: number = 400) {
        super(code, message);
    }
}

/**
 * Error for when a resource is not found
 * Status code: 404
 */
export class NotFound extends Exception {
    constructor(message: string, code: number = 404) {
        super(code, message);
    }
}

/**
 * Error for unauthorized access (not authenticated)
 * Status code: 401
 */
export class Unauthorized extends Exception {
    constructor(message: string = "Unauthorized", code: number = 401) {
        super(code, message);
    }
}

/**
 * Error for forbidden access (authenticated but not allowed)
 * Status code: 403
 */
export class Forbidden extends Exception {
    constructor(message: string = "Forbidden", code: number = 403) {
        super(code, message);
    }
}

/**
 * Error for validation failures
 * Status code: 400
 */
export class ValidationError extends BadRequest {
    constructor(message: string = "Validation error", code: number = 400) {
        super(message, code);
    }
}

/**
 * Error for database operations
 * Status code: 500
 */
export class DatabaseError extends Exception {
    constructor(message: string = "Database error", code: number = 500) {
        super(code, message);
    }
}

/**
 * Success response (not an error but follows the same pattern)
 * Status code: 200
 */
export class Success extends Exception {
    public readonly payload: any;

    constructor(message: string = "Success", payload: any = null, code: number = 0) {
        super(code, message);
        this.payload = payload;
    }
}