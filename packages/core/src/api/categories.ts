import type {MinimumRequest, SessionData} from "@supergrowthai/oneapi";
import {Category, CategoryData} from "@supergrowthai/next-blog-types/server";
import {PaginatedResponse, PaginationParams,} from "@supergrowthai/next-blog-types";
import secure from "../utils/secureInternal.js";
import type {ApiExtra} from "../types/api.js";
import {BadRequest, DatabaseError, NotFound, Success, ValidationError} from "../utils/errors.js";
import {CATEGORY_CREATE_FIELDS, CATEGORY_UPDATE_FIELDS, filterKeys} from "../utils/validation.js";

// List all categories
export const getCategories = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    const db = extra.sdk.db;
    const params = request.query as (PaginationParams & { search?: string; ids?: string }) | undefined;

    try {
        const page = Number(params?.page) || 1;
        const limit = Number(params?.limit) || 10;
        const skip = (page - 1) * limit;

        const query: any = {};

        // Handle search parameter
        if (params?.search) {
            query.name = {$regex: params.search, $options: 'i'};
        }

        // Handle multiple IDs parameter
        if (params?.ids) {
            const ids = params.ids.split(',');
            query._id = {$in: ids};
        }

        let categories = await db.categories.find(query, {
            skip,
            limit,
            projection: {description: 0, metadata: 0}
        });

        // Execute hook for list operation
        const hookResult = await extra.sdk.callHook('category:onList', {
            entity: 'category',
            operation: 'list',
            data: categories
        });
        if (hookResult?.data) {
            categories = hookResult.data;
        }

        const paginatedResponse: PaginatedResponse<Category> = {
            data: categories,
            page,
            limit
        };

        throw new Success("Categories retrieved successfully", paginatedResponse);
    } catch (error) {
        if (error instanceof Success) throw error;

        console.error("Error fetching categories:", error);
        throw new DatabaseError("Failed to retrieve categories: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'categories:list'});

// Get a single category by ID
export const getCategoryById = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    const db = extra.sdk.db;
    const categoryId = request._params?.id;

    try {
        let category = await db.categories.findOne({_id: categoryId});

        if (!category) {
            throw new NotFound(`Category with id ${categoryId} not found`);
        }

        // Execute hook for read operation
        const hookResult = await extra.sdk.callHook('category:onRead', {
            entity: 'category',
            operation: 'read',
            id: categoryId!,
            data: category
        });
        if (hookResult?.data) {
            category = hookResult.data;
        }

        throw new Success("Category retrieved successfully", category);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound) throw error;

        console.error(`Error fetching category ${categoryId}:`, error);
        throw new DatabaseError("Failed to retrieve category: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'categories:read'});

// Create a new category
export const createCategory = secure(async (session: SessionData, request: MinimumRequest<any, Partial<CategoryData>>, extra: ApiExtra) => {
    const db = extra.sdk.db;

    try {
        const rawData = request.body as any;
        let data = filterKeys<CategoryData>(rawData, CATEGORY_CREATE_FIELDS);

        if (!data.name) {
            throw new ValidationError("Category name is required");
        }

        // Execute before create hook
        const beforeResult = await extra.sdk.callHook('category:beforeCreate', {
            entity: 'category',
            operation: 'create',
            data
        });
        if (beforeResult?.data) {
            data = filterKeys<CategoryData>(beforeResult.data, CATEGORY_CREATE_FIELDS);
        }

        const creation = await db.categories.create({
            ...data,
            createdAt: Date.now(),
            updatedAt: Date.now()
        } as CategoryData);

        // Execute after create hook
        await extra.sdk.callHook('category:afterCreate', {
            entity: 'category',
            operation: 'create',
            id: creation._id,
            data: creation
        });

        extra.configuration.callbacks?.on?.("createCategory", creation);

        throw new Success("Category created successfully", creation);
    } catch (error) {
        if (error instanceof Success || error instanceof ValidationError) throw error;

        console.error("Error creating category:", error);
        throw new DatabaseError("Failed to create category: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'categories:create'});

// Update a category
export const updateCategory = secure(async (session: SessionData, request: MinimumRequest<any, Partial<CategoryData>>, extra: ApiExtra) => {
    const db = extra.sdk.db;
    const categoryId = request._params?.id;

    try {
        const rawData = request.body as any;
        let data = filterKeys<CategoryData>(rawData, CATEGORY_UPDATE_FIELDS);

        // Check if category exists first
        const existingCategory = await db.categories.findOne({_id: categoryId});
        if (!existingCategory) {
            throw new NotFound(`Category with id ${categoryId} not found`);
        }

        // Execute before update hook
        const beforeResult = await extra.sdk.callHook('category:beforeUpdate', {
            entity: 'category',
            operation: 'update',
            id: categoryId!,
            data,
            previousData: existingCategory
        });
        if (beforeResult?.data) {
            data = filterKeys<CategoryData>(beforeResult.data, CATEGORY_UPDATE_FIELDS);
        }

        const updation = await db.categories.updateOne(
            {_id: categoryId},
            {
                ...data,
                updatedAt: Date.now()
            }
        );

        // Execute after update hook
        await extra.sdk.callHook('category:afterUpdate', {
            entity: 'category',
            operation: 'update',
            id: categoryId!,
            data: updation,
            previousData: existingCategory
        });

        extra.configuration.callbacks?.on?.("updateCategory", updation);

        throw new Success("Category updated successfully", updation);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound || error instanceof BadRequest) throw error;

        console.error(`Error updating category ${categoryId}:`, error);
        throw new DatabaseError("Failed to update category: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'categories:update'});

// Delete a category
export const deleteCategory = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    const db = extra.sdk.db;
    const categoryId = request._params?.id;

    try {
        // Check if category exists first
        const existingCategory = await db.categories.findOne({_id: categoryId});
        if (!existingCategory) {
            throw new NotFound(`Category with id ${categoryId} not found`);
        }

        // Execute before delete hook
        const beforeResult = await extra.sdk.callHook('category:beforeDelete', {
            entity: 'category',
            operation: 'delete',
            id: categoryId!,
            data: existingCategory
        });
        if (beforeResult?.cancel) {
            throw new BadRequest("Category deletion cancelled by plugin");
        }

        const deletion = await db.categories.deleteOne({_id: categoryId});

        // Execute after delete hook
        await extra.sdk.callHook('category:afterDelete', {
            entity: 'category',
            operation: 'delete',
            id: categoryId!,
            previousData: existingCategory
        });

        extra.configuration.callbacks?.on?.("deleteCategory", deletion);

        throw new Success("Category deleted successfully", deletion);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound || error instanceof BadRequest) throw error;

        console.error(`Error deleting category ${categoryId}:`, error);
        throw new DatabaseError("Failed to delete category: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'categories:delete'});