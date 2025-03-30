import {CNextRequest} from "../types";
import secure from "../utils/secureInternal";
import {
    NotFound,
    Success,
    ValidationError,
    DatabaseError
} from "../utils/errors";

export const getCategories = secure(async (request: CNextRequest) => {
    const db = await request.db();

    try {
        const categories = await db.categories.find({});
        throw new Success("Categories retrieved successfully", categories);
    } catch (error) {
        if (error instanceof Success) throw error;

        console.error("Error fetching categories:", error);
        throw new DatabaseError("Failed to retrieve categories: " + (error instanceof Error ? error.message : String(error)));
    }
});

export const getCategoryById = secure(async (request: CNextRequest) => {
    const db = await request.db();

    try {
        const category = await db.categories.findOne({_id: request._params.id});

        if (!category) {
            throw new NotFound(`Category with id ${request._params.id} not found`);
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

    try {
        const data = await request.json();

        if (!data.name) {
            throw new ValidationError("Category name is required");
        }

        const creation = await db.categories.create({
            ...data,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
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

    try {
        const data = await request.json();

        // Check if category exists first
        const existingCategory = await db.categories.findOne({_id: request._params.id});
        if (!existingCategory) {
            throw new NotFound(`Category with id ${request._params.id} not found`);
        }

        const updation = await db.categories.updateOne(
            {_id: request._params.id}, 
            {
                ...data,
                updatedAt: Date.now()
            }
        );
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

    try {
        // Check if category exists first
        const existingCategory = await db.categories.findOne({_id: request._params.id});
        if (!existingCategory) {
            throw new NotFound(`Category with id ${request._params.id} not found`);
        }

        const deletion = await db.categories.deleteOne({_id: request._params.id});
        request.configuration.callbacks?.on?.("deleteCategory", deletion);
        throw new Success("Category deleted successfully", deletion);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound) throw error;

        console.error(`Error deleting category ${request._params.id}:`, error);
        throw new DatabaseError("Failed to delete category: " + (error instanceof Error ? error.message : String(error)));
    }
});
