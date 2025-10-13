// Re-export errors from oneapi
export {
    Exception,
    BadRequest,
    NotFound,
    UnAuthorised as Unauthorized,
    Forbidden,
    Success,
    InternalServerError as DatabaseError
} from "@supergrowthai/oneapi";

// Add ValidationError as an alias for BadRequest
export {BadRequest as ValidationError} from "@supergrowthai/oneapi";