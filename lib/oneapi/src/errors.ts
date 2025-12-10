/**
 * Custom error classes for OneAPI
 */

export class Exception extends Error {
    constructor(public code: number, message: string, public payload?: any) {
        super(message);
        this.name = 'Exception';
    }
}

export class Success extends Exception {
    constructor(message: string = 'Success', payload?: any) {
        super(0, message, payload);
        this.name = 'Success';
    }
}

export class BadRequest extends Exception {
    constructor(message: string = 'Bad Request') {
        super(400, message);
        this.name = 'BadRequest';
    }
}

export class UnAuthorised extends Exception {
    constructor(message: string = 'Unauthorized') {
        super(401, message);
        this.name = 'UnAuthorised';
    }
}

export class Forbidden extends Exception {
    constructor(message: string = 'Forbidden') {
        super(403, message);
        this.name = 'Forbidden';
    }
}

export class NotFound extends Exception {
    constructor(message: string = 'Not Found') {
        super(404, message);
        this.name = 'NotFound';
    }
}

export class MethodNotAllowed extends Exception {
    constructor(message: string = 'Method Not Allowed') {
        super(405, message);
        this.name = 'MethodNotAllowed';
    }
}

export class InternalServerError extends Exception {
    constructor(message: string = 'Internal Server Error') {
        super(500, message);
        this.name = 'InternalServerError';
    }
}