import secure, {CNextRequest} from "../utils/secureInternal.js";
import {BadRequest, DatabaseError, NotFound, Success, ValidationError} from "../utils/errors.js";

export const getTags = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const sdk = request.sdk;

        try {
            let tags = await db.tags.find({});
            
            // Execute hook for list operation
            if (sdk?.callHook) {
                const hookResult = await sdk.callHook('tag:onList', {
                    entity: 'tag',
                    operation: 'list',
                    filters: {},
                    data: tags
                });
                if (hookResult?.data) {
                    tags = hookResult.data;
                }
            }
            
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
        const sdk = request.sdk;

        try {
            let tag = await db.tags.findOne({_id: request._params.id});

            if (!tag) {
                throw new NotFound(`Tag with id ${request._params.id} not found`);
            }

            // Execute hook for read operation
            if (sdk?.callHook) {
                const hookResult = await sdk.callHook('tag:onRead', {
                    entity: 'tag',
                    operation: 'read',
                    id: request._params.id,
                    data: tag
                });
                if (hookResult?.data) {
                    tag = hookResult.data;
                }
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
        const sdk = request.sdk;

        try {
            let data: any = await request.json();

            if (!data.name) {
                throw new ValidationError("Tag name is required");
            }

            // Execute before create hook
            if (sdk?.callHook) {
                const beforeResult = await sdk.callHook('tag:beforeCreate', {
                    entity: 'tag',
                    operation: 'create',
                    data
                });
                if (beforeResult?.data) {
                    data = beforeResult.data;
                }
            }

            const creation = await db.tags.create({
                ...data,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });

            // Execute after create hook
            if (sdk?.callHook) {
                await sdk.callHook('tag:afterCreate', {
                    entity: 'tag',
                    operation: 'create',
                    id: creation._id,
                    data: creation
                });
            }

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
        const sdk = request.sdk;

        try {
            let data: any = await request.json();

            // Check if tag exists first
            const existingTag = await db.tags.findOne({_id: request._params.id});
            if (!existingTag) {
                throw new NotFound(`Tag with id ${request._params.id} not found`);
            }

            // Execute before update hook
            if (sdk?.callHook) {
                const beforeResult = await sdk.callHook('tag:beforeUpdate', {
                    entity: 'tag',
                    operation: 'update',
                    id: request._params.id,
                    data,
                    previousData: existingTag
                });
                if (beforeResult?.data) {
                    data = beforeResult.data;
                }
            }

            const updation = await db.tags.updateOne(
                {_id: request._params.id},
                {
                    ...data,
                    updatedAt: Date.now()
                }
            );

            // Execute after update hook
            if (sdk?.callHook) {
                await sdk.callHook('tag:afterUpdate', {
                    entity: 'tag',
                    operation: 'update',
                    id: request._params.id,
                    data: updation,
                    previousData: existingTag
                });
            }

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
        const sdk = request.sdk;

        try {
            // Check if tag exists first
            const existingTag = await db.tags.findOne({_id: request._params.id});
            if (!existingTag) {
                throw new NotFound(`Tag with id ${request._params.id} not found`);
            }

            // Execute before delete hook
            if (sdk?.callHook) {
                const beforeResult = await sdk.callHook('tag:beforeDelete', {
                    entity: 'tag',
                    operation: 'delete',
                    id: request._params.id,
                    data: existingTag
                });
                if (beforeResult?.cancel) {
                    throw new BadRequest("Tag deletion cancelled by plugin");
                }
            }

            const deletion = await db.tags.deleteOne({_id: request._params.id});

            // Execute after delete hook
            if (sdk?.callHook) {
                await sdk.callHook('tag:afterDelete', {
                    entity: 'tag',
                    operation: 'delete',
                    id: request._params.id,
                    previousData: existingTag
                });
            }

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