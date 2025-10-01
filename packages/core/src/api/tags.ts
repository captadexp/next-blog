import type {MinimumRequest, SessionData, OneApiFunctionResponse} from "@supergrowthai/oneapi/types";
import {BadRequest, NotFound} from "@supergrowthai/oneapi";
import secure from "../utils/secureInternal.js";
import type {ApiExtra} from "../types/api.js";
import type {TagData} from "@supergrowthai/types/server";

export const getTags = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
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

        return {
            code: 0,
            message: "Tags retrieved successfully",
            payload: tags
        };
    } catch (error) {
        console.error("Error fetching tags:", error);
        return {
            code: 500,
            message: "Failed to retrieve tags: " + (error instanceof Error ? error.message : String(error))
        };
    }
}, {requirePermission: 'tags:list'});

export const getTagById = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = await extra.db();
    const tagId = request._params?.id;

    if (!tagId) {
        throw new BadRequest("Tag ID is required");
    }

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
                id: tagId,
                data: tag
            });
            if (hookResult?.data) {
                tag = hookResult.data;
            }
        }

        return {
            code: 0,
            message: "Tag retrieved successfully",
            payload: tag
        };
    } catch (error) {
        if (error instanceof NotFound) throw error;

        console.error(`Error fetching tag ${tagId}:`, error);
        return {
            code: 500,
            message: "Failed to retrieve tag: " + (error instanceof Error ? error.message : String(error))
        };
    }
}, {requirePermission: 'tags:read'});

export const createTag = secure(async (session: SessionData, request: MinimumRequest<any, Partial<TagData>>, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = await extra.db();

    try {
        let data = request.body as Partial<TagData>;

        if (!data.name) {
            throw new BadRequest("Tag name is required");
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

        return {
            code: 0,
            message: "Tag created successfully",
            payload: creation
        };
    } catch (error) {
        if (error instanceof BadRequest) throw error;

        console.error("Error creating tag:", error);
        return {
            code: 500,
            message: "Failed to create tag: " + (error instanceof Error ? error.message : String(error))
        };
    }
}, {requirePermission: 'tags:create'});

export const updateTag = secure(async (session: SessionData, request: MinimumRequest<any, Partial<TagData>>, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = await extra.db();
    const tagId = request._params?.id;

    if (!tagId) {
        throw new BadRequest("Tag ID is required");
    }

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
                id: tagId,
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
                id: tagId,
                data: updation,
                previousData: existingTag
            });
        }

        extra.configuration.callbacks?.on?.("updateTag", updation);

        return {
            code: 0,
            message: "Tag updated successfully",
            payload: updation
        };
    } catch (error) {
        if (error instanceof NotFound || error instanceof BadRequest) throw error;

        console.error(`Error updating tag ${tagId}:`, error);
        return {
            code: 500,
            message: "Failed to update tag: " + (error instanceof Error ? error.message : String(error))
        };
    }
}, {requirePermission: 'tags:update'});

export const deleteTag = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = await extra.db();
    const tagId = request._params?.id;

    if (!tagId) {
        throw new BadRequest("Tag ID is required");
    }

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
                id: tagId,
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
                id: tagId,
                previousData: existingTag
            });
        }

        extra.configuration.callbacks?.on?.("deleteTag", deletion);

        return {
            code: 0,
            message: "Tag deleted successfully",
            payload: deletion
        };
    } catch (error) {
        if (error instanceof NotFound || error instanceof BadRequest) throw error;

        console.error(`Error deleting tag ${tagId}:`, error);
        return {
            code: 500,
            message: "Failed to delete tag: " + (error instanceof Error ? error.message : String(error))
        };
    }
}, {requireAnyPermission: ['tags:delete', 'all:delete']});