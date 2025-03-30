// Export types
export type {
    Blog,
    BlogData,
    Category,
    CategoryData,
    Tag,
    TagData,
    User,
    UserData,
    Permission,
    PermissionType,
    EntityType,
    Filter,
    DatabaseProvider,
    CollectionOperations,
    Configuration,
    UIConfiguration,
    CNextRequest,
} from './types';

// Export constants
export { PERMISSION_WEIGHTS } from './types';
export { Permissions, PermissionSets } from './permissions';

// Export permission utility functions
export { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    hasEntityAccess,
    getUserEntityPermissions, 
    calculatePermissionWeight 
} from './utils/permissions';

// Export adapters
export { default as FileDBAdapter } from './adapters/FileDBAdapter';
export { default as MongoDBAdapter } from './adapters/MongoDBAdapter';

// Export error types
export {
    Exception,
    BadRequest,
    NotFound,
    Unauthorized,
    Forbidden,
    ValidationError,
    DatabaseError,
    Success
} from './utils/errors';

// Export secure middleware
export { default as secure } from './utils/secureInternal';

// Export helper functions 
export { requirePermission, requireAnyPermission } from './api/users';