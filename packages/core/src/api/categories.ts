import type {MinimumRequest, OneApiFunctionResponse, SessionData} from "@supergrowthai/oneapi/types";
import {BadRequest, NotFound} from "@supergrowthai/oneapi";
import {CategoryData} from "@supergrowthai/types/server";
import secure from "../utils/secureInternal.js";
import type {ApiExtra} from "../types/api.js";

// List all categories
export const getCategories = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = await extra.db();

    try {
        let categories = await db.categories.find({});

        // Execute hook for list operation
        if (extra?.callHook) {
            const hookResult = await extra.callHook('category:onList', {
                entity: 'category',
                operation: 'list',
                filters: {},
                data: categories
            });
            if (hookResult?.data) {
                categories = hookResult.data;
            }
        }

        return {
            code: 0,
            message: "Categories retrieved successfully",
            payload: categories
        };
    } catch (error) {
        console.error("Error fetching categories:", error);
        return {
            code: 500,
            message: "Failed to retrieve categories: " + (error instanceof Error ? error.message : String(error))
        };
    }
});

// Get a single category by ID
export const getCategoryById = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = await extra.db();
    const categoryId = request._params?.id;

    if (!categoryId) {
        throw new BadRequest("Category ID is required");
    }

    try {
        let category = await db.categories.findOne({_id: categoryId});

        if (!category) {
            throw new NotFound(`Category with id ${categoryId} not found`);
        }

        // Execute hook for read operation
        if (extra?.callHook) {
            const hookResult = await extra.callHook('category:onRead', {
                entity: 'category',
                operation: 'read',
                id: categoryId,
                data: category
            });
            if (hookResult?.data) {
                category = hookResult.data;
            }
        }

        return {
            code: 0,
            message: "Category retrieved successfully",
            payload: category
        };
    } catch (error) {
        if (error instanceof NotFound) throw error;

        console.error(`Error fetching category ${categoryId}:`, error);
        return {
            code: 500,
            message: "Failed to retrieve category: " + (error instanceof Error ? error.message : String(error))
        };
    }
});

// Create a new category
export const createCategory = secure(async (session: SessionData, request: MinimumRequest<any, Partial<CategoryData>>, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = await extra.db();

    try {
        let data = request.body as Partial<CategoryData>;

        if (!data.name) {
            throw new BadRequest("Category name is required");
        }

        // Execute before create hook
        if (extra?.callHook) {
            const beforeResult = await extra.callHook('category:beforeCreate', {
                entity: 'category',
                operation: 'create',
                data
            });
            if (beforeResult?.data) {
                data = beforeResult.data;
            }
        }

        const creation = await db.categories.create({
            ...data,
            createdAt: Date.now(),
            updatedAt: Date.now()
        } as CategoryData);

        // Execute after create hook
        if (extra?.callHook) {
            await extra.callHook('category:afterCreate', {
                entity: 'category',
                operation: 'create',
                id: creation._id,
                data: creation
            });
        }

        extra.configuration.callbacks?.on?.("createCategory", creation);

        return {
            code: 0,
            message: "Category created successfully",
            payload: creation
        };
    } catch (error) {
        if (error instanceof BadRequest) throw error;

        console.error("Error creating category:", error);
        return {
            code: 500,
            message: "Failed to create category: " + (error instanceof Error ? error.message : String(error))
        };
    }
}, {requirePermission: 'categories:create'});

// Update a category
export const updateCategory = secure(async (session: SessionData, request: MinimumRequest<any, Partial<CategoryData>>, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = await extra.db();
    const categoryId = request._params?.id;

    if (!categoryId) {
        throw new BadRequest("Category ID is required");
    }

    try {
        let data = request.body as Partial<CategoryData>;

        // Check if category exists first
        const existingCategory = await db.categories.findOne({_id: categoryId});
        if (!existingCategory) {
            throw new NotFound(`Category with id ${categoryId} not found`);
        }

        // Execute before update hook
        if (extra?.callHook) {
            const beforeResult = await extra.callHook('category:beforeUpdate', {
                entity: 'category',
                operation: 'update',
                id: categoryId,
                data,
                previousData: existingCategory
            });
            if (beforeResult?.data) {
                data = beforeResult.data;
            }
        }

        const updation = await db.categories.updateOne(
            {_id: categoryId},
            {
                ...data,
                updatedAt: Date.now()
            }
        );

        // Execute after update hook
        if (extra?.callHook) {
            await extra.callHook('category:afterUpdate', {
                entity: 'category',
                operation: 'update',
                id: categoryId,
                data: updation,
                previousData: existingCategory
            });
        }

        extra.configuration.callbacks?.on?.("updateCategory", updation);

        return {
            code: 0,
            message: "Category updated successfully",
            payload: updation
        };
    } catch (error) {
        if (error instanceof NotFound || error instanceof BadRequest) throw error;

        console.error(`Error updating category ${categoryId}:`, error);
        return {
            code: 500,
            message: "Failed to update category: " + (error instanceof Error ? error.message : String(error))
        };
    }
}, {requirePermission: 'categories:update'});

// Delete a category
export const deleteCategory = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = await extra.db();
    const categoryId = request._params?.id;

    if (!categoryId) {
        throw new BadRequest("Category ID is required");
    }

    try {
        // Check if category exists first
        const existingCategory = await db.categories.findOne({_id: categoryId});
        if (!existingCategory) {
            throw new NotFound(`Category with id ${categoryId} not found`);
        }

        // Execute before delete hook
        if (extra?.callHook) {
            const beforeResult = await extra.callHook('category:beforeDelete', {
                entity: 'category',
                operation: 'delete',
                id: categoryId,
                data: existingCategory
            });
            if (beforeResult?.cancel) {
                throw new BadRequest("Category deletion cancelled by plugin");
            }
        }

        const deletion = await db.categories.deleteOne({_id: categoryId});

        // Execute after delete hook
        if (extra?.callHook) {
            await extra.callHook('category:afterDelete', {
                entity: 'category',
                operation: 'delete',
                id: categoryId,
                previousData: existingCategory
            });
        }

        extra.configuration.callbacks?.on?.("deleteCategory", deletion);

        return {
            code: 0,
            message: "Category deleted successfully",
            payload: deletion
        };
    } catch (error) {
        if (error instanceof NotFound || error instanceof BadRequest) throw error;

        console.error(`Error deleting category ${categoryId}:`, error);
        return {
            code: 500,
            message: "Failed to delete category: " + (error instanceof Error ? error.message : String(error))
        };
    }
}, {requireAnyPermission: ['categories:delete', 'all:delete']});