import type {MinimumRequest, OneApiFunctionResponse, SessionData} from "@supergrowthai/oneapi/types";
import {BadRequest, InternalServerError, NotFound} from "@supergrowthai/oneapi";
import {Permission, User, UserData} from "@supergrowthai/types/server";
import crypto from "../utils/crypto.js";
import secure from "../utils/secureInternal.js";
import type {ApiExtra} from "../types/api.js";

// Get the currently logged in user - requires authentication but no special permission
export const getCurrentUser = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = await extra.db();
    const user = await db.users.findById(session.user._id);

    if (!user) {
        throw new NotFound("User not found");
    }

    // Create a copy of the user object without the password
    const {password, ...userWithoutPassword} = user;

    return {
        code: 0,
        message: "Current user retrieved successfully",
        payload: userWithoutPassword
    };
});

// Helper to check permissions
function hasPermission(user: User, permission: Permission): boolean {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission) || user.permissions.includes('all:all' as Permission);
}

function hasAnyPermission(user: User, permissions: Permission[]): boolean {
    if (!user || !user.permissions) return false;
    return permissions.some(p => hasPermission(user, p));
}

// List all users
export const listUsers = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = await extra.db();
    let users = await db.users.find({});

    // Remove password fields
    let sanitizedUsers = users.map((user: User) => {
        const {password, ...userWithoutPassword} = user;
        return userWithoutPassword;
    });

    // Execute hook for list operation
    if (extra?.callHook) {
        const hookResult = await extra.callHook('user:onList', {
            entity: 'user',
            operation: 'list',
            filters: {},
            data: sanitizedUsers
        });
        if (hookResult?.data) {
            sanitizedUsers = hookResult.data;
        }
    }

    return {
        code: 0,
        message: "Users retrieved successfully",
        payload: sanitizedUsers
    };
}, {requirePermission: 'users:list'});

// Get a specific user by ID
export const getUser = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const userId = request._params?.id;
    if (!userId) {
        throw new BadRequest("User ID is required");
    }

    const db = await extra.db();
    const user = await db.users.findById(userId);

    if (!user) {
        throw new NotFound("User not found");
    }

    // Remove password field
    let {password, ...userWithoutPassword} = user;

    // Execute hook for read operation
    if (extra?.callHook) {
        const hookResult = await extra.callHook('user:onRead', {
            entity: 'user',
            operation: 'read',
            id: userId,
            data: userWithoutPassword
        });
        if (hookResult?.data) {
            userWithoutPassword = hookResult.data;
        }
    }

    return {
        code: 0,
        message: "User retrieved successfully",
        payload: userWithoutPassword
    };
}, {requirePermission: 'users:read'});

// Create a new user
export const createUser = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const body = request.body as any;

    if (!body.username || !body.email || !body.password || !body.name) {
        throw new BadRequest("Username, email, password, and name are required");
    }

    const db = await extra.db();

    // Check if username or email already exists
    const existingUserWithEmail = await db.users.findOne({email: body.email});
    const existingUserWithUsername = await db.users.findOne({username: body.username});

    if (existingUserWithEmail || existingUserWithUsername) {
        throw new BadRequest("Username or email already exists");
    }

    let userData = body;

    // Execute before create hook
    if (extra?.callHook) {
        const beforeResult = await extra.callHook('user:beforeCreate', {
            entity: 'user',
            operation: 'create',
            data: userData
        });
        if (beforeResult?.data) {
            userData = beforeResult.data;
        }
    }

    // Hash the password
    const hashedPassword = crypto.hashPassword(userData.password);

    // Create the user data
    const finalUserData: UserData = {
        username: userData.username,
        email: userData.email,
        name: userData.name,
        slug: userData.slug || userData.username.toLowerCase().replace(/\s+/g, '-'),
        bio: userData.bio || '',
        password: hashedPassword,
        permissions: userData.permissions || [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    const newUser = await db.users.create(finalUserData);

    // Remove password from response
    const {password, ...userWithoutPassword} = newUser;

    // Execute after create hook
    if (extra?.callHook) {
        await extra.callHook('user:afterCreate', {
            entity: 'user',
            operation: 'create',
            id: newUser._id,
            data: userWithoutPassword
        });
    }

    return {
        code: 0,
        message: "User created successfully",
        payload: userWithoutPassword
    };
}, {requirePermission: 'users:create'});

// Update a user
export const updateUser = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const userId = request._params?.id;
    if (!userId) {
        throw new BadRequest("User ID is required");
    }

    let updates = request.body as any;

    const db = await extra.db();
    const existingUser = await db.users.findById(userId);

    if (!existingUser) {
        throw new NotFound("User not found");
    }

    // Execute before update hook
    if (extra?.callHook) {
        const beforeResult = await extra.callHook('user:beforeUpdate', {
            entity: 'user',
            operation: 'update',
            id: userId,
            data: updates,
            previousData: existingUser
        });
        if (beforeResult?.data) {
            updates = beforeResult.data;
        }
    }

    // Create update object
    const updateData: Partial<User> = {};

    if (updates.username) updateData.username = updates.username;
    if (updates.email) updateData.email = updates.email;
    if (updates.name) updateData.name = updates.name;
    if (updates.slug) updateData.slug = updates.slug;
    if (updates.bio !== undefined) updateData.bio = updates.bio;
    if (updates.permissions) updateData.permissions = updates.permissions;

    // If updating password, hash it
    if (updates.password) {
        updateData.password = crypto.hashPassword(updates.password);
    }

    // Update the user with updated timestamp
    updateData.updatedAt = Date.now();

    const updatedUser = await db.users.updateOne({_id: userId}, updateData);

    if (!updatedUser) {
        throw new InternalServerError("Failed to update user");
    }

    // Remove password from response
    const {password, ...userWithoutPassword} = updatedUser;

    // Execute after update hook
    if (extra?.callHook) {
        await extra.callHook('user:afterUpdate', {
            entity: 'user',
            operation: 'update',
            id: userId,
            data: userWithoutPassword,
            previousData: existingUser
        });
    }

    return {
        code: 0,
        message: "User updated successfully",
        payload: userWithoutPassword
    };
}, {requirePermission: 'users:update'});

// Delete a user
export const deleteUser = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const userId = request._params?.id;
    if (!userId) {
        throw new BadRequest("User ID is required");
    }

    const db = await extra.db();

    // Check if the user exists
    const existingUser = await db.users.findById(userId);
    if (!existingUser) {
        throw new NotFound("User not found");
    }

    // Execute before delete hook
    if (extra?.callHook) {
        const beforeResult = await extra.callHook('user:beforeDelete', {
            entity: 'user',
            operation: 'delete',
            id: userId,
            data: existingUser
        });
        if (beforeResult?.cancel) {
            throw new BadRequest("User deletion cancelled by plugin");
        }
    }

    // Delete the user
    const deletedUser = await db.users.deleteOne({_id: userId});

    if (!deletedUser) {
        throw new InternalServerError("Failed to delete user");
    }

    // Remove password from response
    const {password, ...userWithoutPassword} = deletedUser;

    // Execute after delete hook
    if (extra?.callHook) {
        await extra.callHook('user:afterDelete', {
            entity: 'user',
            operation: 'delete',
            id: userId,
            previousData: existingUser
        });
    }

    return {
        code: 0,
        message: "User deleted successfully",
        payload: {_id: userId}
    };
}, {requirePermission: 'users:delete'});
