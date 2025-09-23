import {Permission, User, UserData} from "@supergrowthai/types/server";
import secure, {type CNextRequest} from "../utils/secureInternal.js";
import {BadRequest, NotFound, Success} from "../utils/errors.js";
import crypto from "../utils/crypto.js";

/**
 * Get the currently logged in user
 * This endpoint returns details about the authenticated user
 */
export const getCurrentUser = secure(async (request: CNextRequest) => {
    try {
        // The sessionUser is attached by the secure middleware
        if (!request.sessionUser) {
            throw new NotFound("User not found or not authenticated");
        }

        // Create a copy of the user object without the password
        const {password, ...userWithoutPassword} = request.sessionUser;

        throw new Success("Current user retrieved successfully", userWithoutPassword);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound) throw error;
        throw error;
    }
});

/**
 * Middleware to check permissions
 * This is a helper function that uses the secure middleware with permission options
 */
export const requirePermission = (permission: Permission) => {
    return (fn: (request: CNextRequest) => any) => {
        return secure(fn, {requirePermission: permission});
    };
};

/**
 * Middleware to check if user has any of the given permissions
 */
export const requireAnyPermission = (permissions: Permission[]) => {
    return (fn: (request: CNextRequest) => any) => {
        return secure(fn, {requireAnyPermission: permissions});
    };
};

/**
 * List all users
 * This endpoint returns a list of all users (without password fields)
 */
export const listUsers = requirePermission('users:list')(async (request: CNextRequest) => {
    const sdk = (request as any).sdk;
    
    try {
        const db = await request.db();
        let users = await db.users.find({});

        // Remove password fields
        let sanitizedUsers = users.map(user => {
            const {password, ...userWithoutPassword} = user;
            return userWithoutPassword;
        });

        // Execute hook for list operation
        if (sdk?.callHook) {
            const hookResult = await sdk.callHook('user:onList', {
                entity: 'user',
                operation: 'list',
                filters: {},
                data: sanitizedUsers
            });
            if (hookResult?.data) {
                sanitizedUsers = hookResult.data;
            }
        }

        throw new Success("Users retrieved successfully", sanitizedUsers);
    } catch (error) {
        if (error instanceof Success) throw error;
        throw error;
    }
});

/**
 * Get a specific user by ID
 */
export const getUser = requirePermission('users:read')(async (request: CNextRequest) => {
    const sdk = (request as any).sdk;
    
    try {
        const {id} = request._params;
        if (!id) throw new BadRequest("User ID is required");

        const db = await request.db();
        const user = await db.users.findById(id);

        if (!user) throw new NotFound("User not found");

        // Remove password field
        let {password, ...userWithoutPassword} = user;

        // Execute hook for read operation
        if (sdk?.callHook) {
            const hookResult = await sdk.callHook('user:onRead', {
                entity: 'user',
                operation: 'read',
                id: id,
                data: userWithoutPassword
            });
            if (hookResult?.data) {
                userWithoutPassword = hookResult.data;
            }
        }

        throw new Success("User retrieved successfully", userWithoutPassword);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound || error instanceof BadRequest) throw error;
        throw error;
    }
});

/**
 * Create a new user
 */
export const createUser = requirePermission('users:create')(async (request: CNextRequest) => {
    const sdk = (request as any).sdk;
    
    try {
        let body = await request.json() as any;

        if (!body.username || !body.email || !body.password || !body.name) {
            throw new BadRequest("Username, email, password, and name are required");
        }

        const db = await request.db();

        // Check if username or email already exists
        const existingUserWithEmail = await db.users.findOne({email: body.email});

        const existingUserWithUsername = await db.users.findOne({username: body.username});

        if (existingUserWithEmail || existingUserWithUsername) {
            throw new BadRequest("Username or email already exists");
        }

        // Execute before create hook
        if (sdk?.callHook) {
            const beforeResult = await sdk.callHook('user:beforeCreate', {
                entity: 'user',
                operation: 'create',
                data: body
            });
            if (beforeResult?.data) {
                body = beforeResult.data;
            }
        }

        // Hash the password
        const hashedPassword = crypto.hashPassword(body.password);

        // Create the user data
        const userData: UserData = {
            username: body.username,
            email: body.email,
            name: body.name,
            slug: body.slug || body.username.toLowerCase().replace(/\s+/g, '-'),
            bio: body.bio || '',
            password: hashedPassword,
            permissions: body.permissions || []
        };

        // Add timestamp fields
        const userDataWithTimestamps = {
            ...userData,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const newUser = await db.users.create(userDataWithTimestamps);

        // Remove password from response
        const {password, ...userWithoutPassword} = newUser;

        // Execute after create hook
        if (sdk?.callHook) {
            await sdk.callHook('user:afterCreate', {
                entity: 'user',
                operation: 'create',
                id: newUser._id,
                data: userWithoutPassword
            });
        }

        // Trigger the event callback if configured
        if (request.configuration.callbacks?.on) {
            request.configuration.callbacks.on("createUser", newUser);
        }

        throw new Success("User created successfully", userWithoutPassword);
    } catch (error) {
        if (error instanceof Success || error instanceof BadRequest) throw error;
        throw error;
    }
});

/**
 * Update a user
 */
export const updateUser = requirePermission('users:update')(async (request: CNextRequest) => {
    const sdk = (request as any).sdk;
    
    try {
        const {id} = request._params;
        if (!id) throw new BadRequest("User ID is required");

        let body = await request.json() as any;

        const db = await request.db();
        const existingUser = await db.users.findById(id);

        if (!existingUser) throw new NotFound("User not found");

        // Execute before update hook
        if (sdk?.callHook) {
            const beforeResult = await sdk.callHook('user:beforeUpdate', {
                entity: 'user',
                operation: 'update',
                id: id,
                data: body,
                previousData: existingUser
            });
            if (beforeResult?.data) {
                body = beforeResult.data;
            }
        }

        // Create update object
        const update: Partial<User> = {};

        if (body.username) update.username = body.username;
        if (body.email) update.email = body.email;
        if (body.name) update.name = body.name;
        if (body.slug) update.slug = body.slug;
        if (body.bio) update.bio = body.bio;
        if (body.permissions) update.permissions = body.permissions;

        // If updating password, hash it
        if (body.password) {
            update.password = crypto.hashPassword(body.password);
        }

        // Update the user with updated timestamp
        const updatedUser = await db.users.updateOne({_id: id}, {
            ...update,
            updatedAt: Date.now()
        });

        // Remove password from response
        const {password, ...userWithoutPassword} = updatedUser!;

        // Execute after update hook
        if (sdk?.callHook) {
            await sdk.callHook('user:afterUpdate', {
                entity: 'user',
                operation: 'update',
                id: id,
                data: userWithoutPassword,
                previousData: existingUser
            });
        }

        // Trigger the event callback if configured
        if (request.configuration.callbacks?.on) {
            request.configuration.callbacks.on("updateUser", updatedUser);
        }

        throw new Success("User updated successfully", userWithoutPassword);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound || error instanceof BadRequest) throw error;
        throw error;
    }
});

/**
 * Delete a user
 */
export const deleteUser = requirePermission('users:delete')(async (request: CNextRequest) => {
    const sdk = (request as any).sdk;
    
    try {
        const {id} = request._params;
        if (!id) throw new BadRequest("User ID is required");

        const db = await request.db();

        // Check if the user exists
        const existingUser = await db.users.findById(id);
        if (!existingUser) throw new NotFound("User not found");

        // Execute before delete hook
        if (sdk?.callHook) {
            const beforeResult = await sdk.callHook('user:beforeDelete', {
                entity: 'user',
                operation: 'delete',
                id: id,
                data: existingUser
            });
            if (beforeResult?.cancel) {
                throw new BadRequest("User deletion cancelled by plugin");
            }
        }

        // Delete the user
        const deletedUser = await db.users.deleteOne({_id: id});

        // Remove password from response
        const {password, ...userWithoutPassword} = deletedUser!;

        // Execute after delete hook
        if (sdk?.callHook) {
            await sdk.callHook('user:afterDelete', {
                entity: 'user',
                operation: 'delete',
                id: id,
                previousData: existingUser
            });
        }

        // Trigger the event callback if configured
        if (request.configuration.callbacks?.on) {
            request.configuration.callbacks.on("deleteUser", deletedUser);
        }

        throw new Success("User deleted successfully", userWithoutPassword);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound || error instanceof BadRequest) throw error;
        throw error;
    }
});
