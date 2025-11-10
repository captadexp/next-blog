import type {MinimumRequest, SessionData} from "@supergrowthai/oneapi";
import type {TagData} from "@supergrowthai/next-blog-types/server";
import {Tag} from "@supergrowthai/next-blog-types/server";
import {PaginatedResponse, PaginationParams,} from "@supergrowthai/next-blog-types";
import secure from "../utils/secureInternal.js";
import type {ApiExtra} from "../types/api.js";
import {BadRequest, DatabaseError, NotFound, Success, ValidationError} from "../utils/errors.js";
import {filterKeys, TAG_CREATE_FIELDS, TAG_UPDATE_FIELDS} from "../utils/validation.js";

export const getTags = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
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

        let tags = await db.tags.find(query, {skip, limit});

        // Execute hook for list operation
        const hookResult = await extra.sdk.callHook('tag:onList', {
            entity: 'tag',
            operation: 'list',
            data: tags
        });
        if (hookResult?.data) {
            tags = hookResult.data;
        }

        const paginatedResponse: PaginatedResponse<Tag> = {
            data: tags,
            page,
            limit
        };

        throw new Success("Tags retrieved successfully", paginatedResponse);
    } catch (error) {
        if (error instanceof Success) throw error;

        console.error("Error fetching tags:", error);
        throw new DatabaseError("Failed to retrieve tags: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'tags:list'});

export const getTagById = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    const db = extra.sdk.db;
    const tagId = request._params?.id;

    try {
        let tag = await db.tags.findOne({_id: tagId});

        if (!tag) {
            throw new NotFound(`Tag with id ${tagId} not found`);
        }

        // Execute hook for read operation
        const hookResult = await extra.sdk.callHook('tag:onRead', {
            entity: 'tag',
            operation: 'read',
            id: tagId!,
            data: tag
        });
        if (hookResult?.data) {
            tag = hookResult.data;
        }

        throw new Success("Tag retrieved successfully", tag);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound) throw error;

        console.error(`Error fetching tag ${tagId}:`, error);
        throw new DatabaseError("Failed to retrieve tag: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'tags:read'});

export const createTag = secure(async (session: SessionData, request: MinimumRequest<any, Partial<TagData>>, extra: ApiExtra) => {
    const db = extra.sdk.db;

    try {
        const rawData = request.body as any;
        let data = filterKeys<TagData>(rawData, TAG_CREATE_FIELDS);

        if (!data.name) {
            throw new ValidationError("Tag name is required");
        }

        // Execute before create hook
        const beforeResult = await extra.sdk.callHook('tag:beforeCreate', {
            entity: 'tag',
            operation: 'create',
            data
        });
        if (beforeResult?.data) {
            data = filterKeys<TagData>(beforeResult.data, TAG_CREATE_FIELDS);
        }

        const creation = await db.tags.create({
            ...data,
            createdAt: Date.now(),
            updatedAt: Date.now()
        } as TagData);

        // Execute after create hook
        await extra.sdk.callHook('tag:afterCreate', {
            entity: 'tag',
            operation: 'create',
            id: creation._id,
            data: creation
        });

        extra.configuration.callbacks?.on?.("createTag", creation);

        throw new Success("Tag created successfully", creation);
    } catch (error) {
        if (error instanceof Success || error instanceof ValidationError) throw error;

        console.error("Error creating tag:", error);
        throw new DatabaseError("Failed to create tag: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'tags:create'});

export const updateTag = secure(async (session: SessionData, request: MinimumRequest<any, Partial<TagData>>, extra: ApiExtra) => {
    const db = extra.sdk.db;
    const tagId = request._params?.id;

    try {
        const rawData = request.body as any;
        let data = filterKeys<TagData>(rawData, TAG_UPDATE_FIELDS);

        // Check if tag exists first
        const existingTag = await db.tags.findOne({_id: tagId});
        if (!existingTag) {
            throw new NotFound(`Tag with id ${tagId} not found`);
        }

        // Execute before update hook
        const beforeResult = await extra.sdk.callHook('tag:beforeUpdate', {
            entity: 'tag',
            operation: 'update',
            id: tagId!,
            data,
            previousData: existingTag
        });
        if (beforeResult?.data) {
            data = filterKeys<TagData>(beforeResult.data, TAG_UPDATE_FIELDS);
        }

        const updation = await db.tags.updateOne(
            {_id: tagId},
            {
                ...data,
                updatedAt: Date.now()
            }
        );

        // Execute after update hook
        await extra.sdk.callHook('tag:afterUpdate', {
            entity: 'tag',
            operation: 'update',
            id: tagId!,
            data: updation,
            previousData: existingTag
        });

        extra.configuration.callbacks?.on?.("updateTag", updation);

        throw new Success("Tag updated successfully", updation);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound || error instanceof BadRequest) throw error;

        console.error(`Error updating tag ${tagId}:`, error);
        throw new DatabaseError("Failed to update tag: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'tags:update'});

export const deleteTag = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    const db = extra.sdk.db;
    const tagId = request._params?.id;

    try {
        // Check if tag exists first
        const existingTag = await db.tags.findOne({_id: tagId});
        if (!existingTag) {
            throw new NotFound(`Tag with id ${tagId} not found`);
        }

        // Execute before delete hook
        const beforeResult = await extra.sdk.callHook('tag:beforeDelete', {
            entity: 'tag',
            operation: 'delete',
            id: tagId!,
            data: existingTag
        });
        if (beforeResult?.cancel) {
            throw new BadRequest("Tag deletion cancelled by plugin");
        }

        const deletion = await db.tags.deleteOne({_id: tagId});

        // Execute after delete hook
        await extra.sdk.callHook('tag:afterDelete', {
            entity: 'tag',
            operation: 'delete',
            id: tagId!,
            previousData: existingTag
        });

        extra.configuration.callbacks?.on?.("deleteTag", deletion);

        throw new Success("Tag deleted successfully", deletion);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound || error instanceof BadRequest) throw error;

        console.error(`Error deleting tag ${tagId}:`, error);
        throw new DatabaseError("Failed to delete tag: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'tags:delete'});