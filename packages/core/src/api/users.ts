import type {MinimumRequest, SessionData} from "@supergrowthai/oneapi";
import {User, UserData} from "@supergrowthai/next-blog-types/server";
import {PaginatedResponse, PaginationParams,} from "@supergrowthai/next-blog-types";
import crypto from "../utils/crypto.js";
import secure from "../utils/secureInternal.js";
import type {ApiExtra} from "../types/api.js";
import {BadRequest, DatabaseError, NotFound, Success, ValidationError} from "../utils/errors.js";
import {BasicAuthHandler} from "../auth/basic-auth-handler.ts";
import {filterKeys, USER_CREATE_FIELDS, USER_UPDATE_FIELDS} from "../utils/validation.js";

// Get the currently logged in user - requires authentication but no special permission
export const getCurrentUser = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    const db = extra.sdk.db;
    const user = await db.users.findById(session.user._id);

    if (!user) {
        throw new NotFound("User not found");
    }

    // Create a copy of the user object without the password
    const {password, ...userWithoutPassword} = user;

    throw new Success("Current user retrieved successfully", userWithoutPassword);
});

export const login = async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    const username = request.body!.username;
    const password = request.body!.password;

    const result = await (session.authHandler as BasicAuthHandler)?.login({
        username,
        password
    }, request._request!, request._response!);


    if (result.success)
        return {code: 0, message: "Success", payload: result.user}
    else
        return {code: -1, message: "Failed to login"}
}

export const logout = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    await (session.authHandler as BasicAuthHandler)?.logout(request._request!, request._response!);

    return {code: 0, message: "Success"}
})

// List all users
export const listUsers = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    const db = extra.sdk.db;
    const params = request.query as PaginationParams | undefined;

    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 10;
    const skip = (page - 1) * limit;

    let users = await db.users.find({}, {skip, limit, sort: {_id: -1}});

    // Remove password fields
    let sanitizedUsers = users.map((user: User) => {
        const {password, ...userWithoutPassword} = user;
        return userWithoutPassword;
    });

    // Execute hook for list operation
    const hookResult = await extra.sdk.callHook('user:onList', {
        entity: 'user',
        operation: 'list',
        data: sanitizedUsers
    });
    if (hookResult?.data) {
        sanitizedUsers = hookResult.data;
    }

    const paginatedResponse: PaginatedResponse<Omit<User, 'password'>> = {
        data: sanitizedUsers,
        page,
        limit
    };

    throw new Success("Users retrieved successfully", paginatedResponse);
}, {requirePermission: 'users:list'});

// Get a specific user by ID
export const getUser = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    const userId = request._params?.id;

    const db = extra.sdk.db;
    const user = await db.users.findById(userId!);

    if (!user) {
        throw new NotFound("User not found");
    }

    // Remove password field
    let {password, ...userWithoutPassword} = user;

    // Execute hook for read operation
    const hookResult = await extra.sdk.callHook('user:onRead', {
        entity: 'user',
        operation: 'read',
        id: userId!,
        data: userWithoutPassword
    });
    if (hookResult?.data) {
        userWithoutPassword = hookResult.data;
    }

    throw new Success("User retrieved successfully", userWithoutPassword);
}, {requirePermission: 'users:read'});

// Create a new user
export const createUser = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    const rawBody = request.body as any;
    const body = filterKeys<UserData>(rawBody, USER_CREATE_FIELDS);

    if (!body.username || !body.email || !body.password || !body.name) {
        throw new ValidationError("Username, email, password, and name are required");
    }

    const db = extra.sdk.db;

    // Check if username or email already exists
    const existingUserWithEmail = await db.users.findOne({email: body.email});
    const existingUserWithUsername = await db.users.findOne({username: body.username});

    if (existingUserWithEmail || existingUserWithUsername) {
        throw new BadRequest("Username or email already exists");
    }

    let userData = body;

    // Execute before create hook
    const beforeResult = await extra.sdk.callHook('user:beforeCreate', {
        entity: 'user',
        operation: 'create',
        data: userData
    });
    if (beforeResult?.data) {
        userData = filterKeys<UserData>(beforeResult.data, USER_CREATE_FIELDS);
    }

    // Hash the password
    const hashedPassword = crypto.hashPassword(userData.password!);

    // Create the user data
    const finalUserData: UserData = {
        username: userData.username!,
        email: userData.email!,
        name: userData.name!,
        slug: userData.slug || userData.username!.toLowerCase().replace(/\s+/g, '-'),
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
    await extra.sdk.callHook('user:afterCreate', {
        entity: 'user',
        operation: 'create',
        id: newUser._id,
        data: userWithoutPassword
    });

    throw new Success("User created successfully", userWithoutPassword);
}, {requirePermission: 'users:create'});

// Update a user
export const updateUser = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    const userId = request._params?.id;

    const rawUpdates = request.body as any;
    let updates = filterKeys<UserData>(rawUpdates, USER_UPDATE_FIELDS);

    const db = extra.sdk.db;
    const existingUser = await db.users.findById(userId!);

    if (!existingUser) {
        throw new NotFound("User not found");
    }

    // Prevent editing of system user
    if (existingUser.isSystem) {
        throw new BadRequest("System user cannot be edited");
    }

    // Execute before update hook
    const beforeResult = await extra.sdk.callHook('user:beforeUpdate', {
        entity: 'user',
        operation: 'update',
        id: userId!,
        data: updates,
        previousData: existingUser
    });
    if (beforeResult?.data) {
        updates = filterKeys<UserData>(beforeResult.data, USER_UPDATE_FIELDS);
    }

    // Create update object with only non-undefined values
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
        throw new DatabaseError("Failed to update user");
    }

    // Remove password from response
    const {password, ...userWithoutPassword} = updatedUser;

    // Execute after update hook
    await extra.sdk.callHook('user:afterUpdate', {
        entity: 'user',
        operation: 'update',
        id: userId!,
        data: userWithoutPassword,
        previousData: existingUser
    });

    throw new Success("User updated successfully", userWithoutPassword);
}, {requirePermission: 'users:update'});

// Delete a user
export const deleteUser = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    const userId = request._params?.id;

    const db = extra.sdk.db;

    // Check if the user exists
    const existingUser = await db.users.findById(userId!);
    if (!existingUser) {
        throw new NotFound("User not found");
    }

    // Prevent deletion of system user
    if (existingUser.isSystem) {
        throw new BadRequest("System user cannot be deleted");
    }

    // Execute before delete hook
    const beforeResult = await extra.sdk.callHook('user:beforeDelete', {
        entity: 'user',
        operation: 'delete',
        id: userId!,
        data: existingUser
    });
    if (beforeResult?.cancel) {
        throw new BadRequest("User deletion cancelled by plugin");
    }

    // Delete the user
    const deletedUser = await db.users.deleteOne({_id: userId});

    if (!deletedUser) {
        throw new DatabaseError("Failed to delete user");
    }

    // Remove password from response
    const {password, ...userWithoutPassword} = deletedUser;

    // Execute after delete hook
    await extra.sdk.callHook('user:afterDelete', {
        entity: 'user',
        operation: 'delete',
        id: userId!,
        previousData: existingUser
    });

    throw new Success("User deleted successfully", {_id: userId});
}, {requirePermission: 'users:delete'});
