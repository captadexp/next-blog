import type {MinimumRequest, SessionData, OneApiFunctionResponse} from "@supergrowthai/oneapi";
import secure from "../utils/secureInternal.js";
import type {ApiExtra} from "../types/api.js";
import type {TagData} from "@supergrowthai/next-blog-types/server";
import {BadRequest, DatabaseError, NotFound, Success, ValidationError} from "../utils/errors.js";

export const getTags = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    const db = await extra.db();

    try {
        let tags = await db.tags.find({});

        // Execute hook for list operation
        if (extra?.callHook) {
            const hookResult = await extra.callHook('tag:onList', {
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
}, {requirePermission: 'tags:list'});

export const getTagById = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    const db = await extra.db();
    const tagId = request._params?.id;

    try {
        let tag = await db.tags.findOne({_id: tagId});

        if (!tag) {
            throw new NotFound(`Tag with id ${tagId} not found`);
        }

        // Execute hook for read operation
        if (extra?.callHook) {
            const hookResult = await extra.callHook('tag:onRead', {
                entity: 'tag',
                operation: 'read',
                id: tagId!,
                data: tag
            });
            if (hookResult?.data) {
                tag = hookResult.data;
            }
        }

        throw new Success("Tag retrieved successfully", tag);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound) throw error;

        console.error(`Error fetching tag ${tagId}:`, error);
        throw new DatabaseError("Failed to retrieve tag: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'tags:read'});

export const createTag = secure(async (session: SessionData, request: MinimumRequest<any, Partial<TagData>>, extra: ApiExtra) => {
    const db = await extra.db();

    try {
        let data = request.body as Partial<TagData>;

        if (!data.name) {
            throw new ValidationError("Tag name is required");
        }

        // Execute before create hook
        if (extra?.callHook) {
            const beforeResult = await extra.callHook('tag:beforeCreate', {
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
        } as TagData);

        // Execute after create hook
        if (extra?.callHook) {
            await extra.callHook('tag:afterCreate', {
                entity: 'tag',
                operation: 'create',
                id: creation._id,
                data: creation
            });
        }

        extra.configuration.callbacks?.on?.("createTag", creation);

        throw new Success("Tag created successfully", creation);
    } catch (error) {
        if (error instanceof Success || error instanceof ValidationError) throw error;

        console.error("Error creating tag:", error);
        throw new DatabaseError("Failed to create tag: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'tags:create'});

export const updateTag = secure(async (session: SessionData, request: MinimumRequest<any, Partial<TagData>>, extra: ApiExtra) => {
    const db = await extra.db();
    const tagId = request._params?.id;

    try {
        let data = request.body as Partial<TagData>;

        // Check if tag exists first
        const existingTag = await db.tags.findOne({_id: tagId});
        if (!existingTag) {
            throw new NotFound(`Tag with id ${tagId} not found`);
        }

        // Execute before update hook
        if (extra?.callHook) {
            const beforeResult = await extra.callHook('tag:beforeUpdate', {
                entity: 'tag',
                operation: 'update',
                id: tagId!,
                data,
                previousData: existingTag
            });
            if (beforeResult?.data) {
                data = beforeResult.data;
            }
        }

        const updation = await db.tags.updateOne(
            {_id: tagId},
            {
                ...data,
                updatedAt: Date.now()
            }
        );

        // Execute after update hook
        if (extra?.callHook) {
            await extra.callHook('tag:afterUpdate', {
                entity: 'tag',
                operation: 'update',
                id: tagId!,
                data: updation,
                previousData: existingTag
            });
        }

        extra.configuration.callbacks?.on?.("updateTag", updation);

        throw new Success("Tag updated successfully", updation);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound || error instanceof BadRequest) throw error;

        console.error(`Error updating tag ${tagId}:`, error);
        throw new DatabaseError("Failed to update tag: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'tags:update'});

export const deleteTag = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    const db = await extra.db();
    const tagId = request._params?.id;

    try {
        // Check if tag exists first
        const existingTag = await db.tags.findOne({_id: tagId});
        if (!existingTag) {
            throw new NotFound(`Tag with id ${tagId} not found`);
        }

        // Execute before delete hook
        if (extra?.callHook) {
            const beforeResult = await extra.callHook('tag:beforeDelete', {
                entity: 'tag',
                operation: 'delete',
                id: tagId!,
                data: existingTag
            });
            if (beforeResult?.cancel) {
                throw new BadRequest("Tag deletion cancelled by plugin");
            }
        }

        const deletion = await db.tags.deleteOne({_id: tagId});

        // Execute after delete hook
        if (extra?.callHook) {
            await extra.callHook('tag:afterDelete', {
                entity: 'tag',
                operation: 'delete',
                id: tagId!,
                previousData: existingTag
            });
        }

        extra.configuration.callbacks?.on?.("deleteTag", deletion);

        throw new Success("Tag deleted successfully", deletion);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound || error instanceof BadRequest) throw error;

        console.error(`Error deleting tag ${tagId}:`, error);
        throw new DatabaseError("Failed to delete tag: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'tags:delete'});