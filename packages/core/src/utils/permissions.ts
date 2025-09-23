import {EntityType, Permission, PERMISSION_WEIGHTS, PermissionType, User} from '@supergrowthai/types/server';

/**
 * Calculate the weight of a permission
 * Higher weights mean more powerful permissions
 */
export function calculatePermissionWeight(permission: Permission): number {
    const [entityType, actionType] = permission.split(':') as [EntityType, PermissionType];

    // Get the weights from the constants
    const entityWeight = PERMISSION_WEIGHTS.entity[entityType] || 0;
    const actionWeight = PERMISSION_WEIGHTS.action[actionType] || 0;

    // Combine weights: multiply to ensure entity weight is significant
    return entityWeight * actionWeight;
}

/**
 * Check if user has a specific permission
 * Directly compares the requested permission with user's permissions
 */
export function hasExactPermission(user: User, requiredPermission: Permission): boolean {
    if (!user || !user.permissions) return false;

    return user.permissions.includes(requiredPermission);
}

/**
 * Check if user has a permission that is equal to or higher than the required permission
 * This compares permission weights to determine if user has sufficient privileges
 */
export function hasPermission(user: User, requiredPermission: Permission): boolean {
    if (!user || !user.permissions) return false;

    // Split the required permission into entity and action
    const [reqEntity, reqAction] = requiredPermission.split(':') as [EntityType, PermissionType];

    // Check each permission that the user has
    return user.permissions.some(permission => {
        const [entity, action] = permission.split(':') as [EntityType, PermissionType];

        // Check if the user has the all:all permission
        if (entity === 'all' && action === 'all') return true;

        // Check if the user has all permissions for the required entity
        if (entity === reqEntity && action === 'all') return true;

        // Check if the user has all permissions for all entities with the required action
        if (entity === 'all' && action === reqAction) return true;

        // Check if the user has the exact required permission
        if (permission === requiredPermission) return true;

        // Use weight system to check if user has a higher permission than required
        if (entity === reqEntity || entity === 'all') {
            const userPermWeight = calculatePermissionWeight(permission);
            const requiredPermWeight = calculatePermissionWeight(requiredPermission);

            return userPermWeight >= requiredPermWeight;
        }

        return false;
    });
}

/**
 * Check if user has any of the provided permissions
 */
export function hasAnyPermission(user: User, permissions: Permission[]): boolean {
    return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if user has all of the provided permissions
 */
export function hasAllPermissions(user: User, permissions: Permission[]): boolean {
    return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Get all permissions that a user has for a specific entity
 */
export function getUserEntityPermissions(user: User, entity: EntityType): Permission[] {
    if (!user || !user.permissions) return [];

    return user.permissions.filter(permission => {
        const [permEntity] = permission.split(':') as [EntityType, PermissionType];
        return permEntity === entity || permEntity === 'all';
    });
}

/**
 * Check if a user has any permission for a specific entity
 */
export function hasEntityAccess(user: User, entity: EntityType): boolean {
    return getUserEntityPermissions(user, entity).length > 0;
}
