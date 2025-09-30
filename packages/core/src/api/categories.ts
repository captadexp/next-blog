import secure, {CNextRequest} from "../utils/secureInternal.js";
import {BadRequest, DatabaseError, NotFound, Success, ValidationError} from "../utils/errors.js";

export const getCategories = secure(async (request: CNextRequest) => {
    const db = await request.db();
    const sdk = request.sdk;

    try {
        let categories = await db.categories.find({});
        
        // Execute hook for list operation
        if (sdk?.callHook) {
            const hookResult = await sdk.callHook('category:onList', {
                entity: 'category',
                operation: 'list',
                filters: {},
                data: categories
            });
            if (hookResult?.data) {
                categories = hookResult.data;
            }
        }
        
        throw new Success("Categories retrieved successfully", categories);
    } catch (error) {
        if (error instanceof Success) throw error;

        console.error("Error fetching categories:", error);
        throw new DatabaseError("Failed to retrieve categories: " + (error instanceof Error ? error.message : String(error)));
    }
});

export const getCategoryById = secure(async (request: CNextRequest) => {
    const db = await request.db();
    const sdk = request.sdk;

    try {
        let category = await db.categories.findOne({_id: request._params.id});

        if (!category) {
            throw new NotFound(`Category with id ${request._params.id} not found`);
        }

        // Execute hook for read operation
        if (sdk?.callHook) {
            const hookResult = await sdk.callHook('category:onRead', {
                entity: 'category',
                operation: 'read',
                id: request._params.id,
                data: category
            });
            if (hookResult?.data) {
                category = hookResult.data;
            }
        }

        throw new Success("Category retrieved successfully", category);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound) throw error;

        console.error(`Error fetching category ${request._params.id}:`, error);
        throw new DatabaseError("Failed to retrieve category: " + (error instanceof Error ? error.message : String(error)));
    }
});

export const createCategory = secure(async (request: CNextRequest) => {
    const db = await request.db();
    const sdk = request.sdk;

    try {
        let data: any = await request.json();

        if (!data.name) {
            throw new ValidationError("Category name is required");
        }

        // Execute before create hook
        if (sdk?.callHook) {
            const beforeResult = await sdk.callHook('category:beforeCreate', {
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
        });

        // Execute after create hook
        if (sdk?.callHook) {
            await sdk.callHook('category:afterCreate', {
                entity: 'category',
                operation: 'create',
                id: creation._id,
                data: creation
            });
        }

        request.configuration.callbacks?.on?.("createCategory", creation);
        throw new Success("Category created successfully", creation);
    } catch (error) {
        if (error instanceof Success || error instanceof ValidationError) throw error;

        console.error("Error creating category:", error);
        throw new DatabaseError("Failed to create category: " + (error instanceof Error ? error.message : String(error)));
    }
});

export const updateCategory = secure(async (request: CNextRequest) => {
    const db = await request.db();
    const sdk = request.sdk;

    try {
        let data: any = await request.json();

        // Check if category exists first
        const existingCategory = await db.categories.findOne({_id: request._params.id});
        if (!existingCategory) {
            throw new NotFound(`Category with id ${request._params.id} not found`);
        }

        // Execute before update hook
        if (sdk?.callHook) {
            const beforeResult = await sdk.callHook('category:beforeUpdate', {
                entity: 'category',
                operation: 'update',
                id: request._params.id,
                data,
                previousData: existingCategory
            });
            if (beforeResult?.data) {
                data = beforeResult.data;
            }
        }

        const updation = await db.categories.updateOne(
            {_id: request._params.id},
            {
                ...data,
                updatedAt: Date.now()
            }
        );

        // Execute after update hook
        if (sdk?.callHook) {
            await sdk.callHook('category:afterUpdate', {
                entity: 'category',
                operation: 'update',
                id: request._params.id,
                data: updation,
                previousData: existingCategory
            });
        }

        request.configuration.callbacks?.on?.("updateCategory", updation);
        throw new Success("Category updated successfully", updation);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound || error instanceof ValidationError) throw error;

        console.error(`Error updating category ${request._params.id}:`, error);
        throw new DatabaseError("Failed to update category: " + (error instanceof Error ? error.message : String(error)));
    }
});

export const deleteCategory = secure(async (request: CNextRequest) => {
    const db = await request.db();
    const sdk = request.sdk;

    try {
        // Check if category exists first
        const existingCategory = await db.categories.findOne({_id: request._params.id});
        if (!existingCategory) {
            throw new NotFound(`Category with id ${request._params.id} not found`);
        }

        // Execute before delete hook
        if (sdk?.callHook) {
            const beforeResult = await sdk.callHook('category:beforeDelete', {
                entity: 'category',
                operation: 'delete',
                id: request._params.id,
                data: existingCategory
            });
            if (beforeResult?.cancel) {
                throw new BadRequest("Category deletion cancelled by plugin");
            }
        }

        const deletion = await db.categories.deleteOne({_id: request._params.id});

        // Execute after delete hook
        if (sdk?.callHook) {
            await sdk.callHook('category:afterDelete', {
                entity: 'category',
                operation: 'delete',
                id: request._params.id,
                previousData: existingCategory
            });
        }

        request.configuration.callbacks?.on?.("deleteCategory", deletion);
        throw new Success("Category deleted successfully", deletion);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound) throw error;

        console.error(`Error deleting category ${request._params.id}:`, error);
        throw new DatabaseError("Failed to delete category: " + (error instanceof Error ? error.message : String(error)));
    }
});
