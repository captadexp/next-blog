import secure, {CNextRequest} from "../utils/secureInternal.js";
import {DatabaseError, NotFound, Success, ValidationError} from "../utils/errors.js";

export const getTags = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            const tags = await db.tags.find({});
            throw new Success("Tags retrieved successfully", tags);
        } catch (error) {
            if (error instanceof Success) throw error;

            console.error("Error fetching tags:", error);
            throw new DatabaseError("Failed to retrieve tags: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'tags:list'}
);

export const getTagById = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            const tag = await db.tags.findOne({_id: request._params.id});

            if (!tag) {
                throw new NotFound(`Tag with id ${request._params.id} not found`);
            }

            throw new Success("Tag retrieved successfully", tag);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound) throw error;

            console.error(`Error fetching tag ${request._params.id}:`, error);
            throw new DatabaseError("Failed to retrieve tag: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'tags:read'}
);

export const createTag = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            const data: any = await request.json();

            if (!data.name) {
                throw new ValidationError("Tag name is required");
            }

            const creation = await db.tags.create({
                ...data,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            request.configuration.callbacks?.on?.("createTag", creation);
            throw new Success("Tag created successfully", creation);
        } catch (error) {
            if (error instanceof Success || error instanceof ValidationError) throw error;

            console.error("Error creating tag:", error);
            throw new DatabaseError("Failed to create tag: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'tags:create'}
);

export const updateTag = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            const data: any = await request.json();

            // Check if tag exists first
            const existingTag = await db.tags.findOne({_id: request._params.id});
            if (!existingTag) {
                throw new NotFound(`Tag with id ${request._params.id} not found`);
            }

            const updation = await db.tags.updateOne(
                {_id: request._params.id},
                {
                    ...data,
                    updatedAt: Date.now()
                }
            );
            request.configuration.callbacks?.on?.("updateTag", updation);
            throw new Success("Tag updated successfully", updation);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound || error instanceof ValidationError) throw error;

            console.error(`Error updating tag ${request._params.id}:`, error);
            throw new DatabaseError("Failed to update tag: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'tags:update'}
);

export const deleteTag = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            // Check if tag exists first
            const existingTag = await db.tags.findOne({_id: request._params.id});
            if (!existingTag) {
                throw new NotFound(`Tag with id ${request._params.id} not found`);
            }

            const deletion = await db.tags.deleteOne({_id: request._params.id});
            request.configuration.callbacks?.on?.("deleteTag", deletion);
            throw new Success("Tag deleted successfully", deletion);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound) throw error;

            console.error(`Error deleting tag ${request._params.id}:`, error);
            throw new DatabaseError("Failed to delete tag: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requireAnyPermission: ['tags:delete', 'all:delete']}
);