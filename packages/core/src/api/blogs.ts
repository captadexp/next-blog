import type {MinimumRequest, SessionData} from "@supergrowthai/oneapi";
import {Blog, BlogData, Permission} from "@supergrowthai/next-blog-types/server";
import {PaginatedResponse, PaginationParams,} from "@supergrowthai/next-blog-types";
import secure from "../utils/secureInternal.js";
import type {ApiExtra} from "../types/api.js";
import {BadRequest, DatabaseError, NotFound, Success, ValidationError} from "../utils/errors.js";
import {BLOG_CREATE_FIELDS, BLOG_UPDATE_FIELDS, filterKeys} from "../utils/validation.js";

// List all blogs
export const getBlogs = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    const db = extra.sdk.db;
    const params = request.query as PaginationParams | undefined;

    try {
        const page = Number(params?.page) || 1;
        const limit = Number(params?.limit) || 10;
        const skip = (page - 1) * limit;
        let blogs = await db.blogs.find({}, {
            skip,
            limit,
            sort: {_id: -1},
            projection: {_id: 1, title: 1, createdAt: 1, updatedAt: 1}
        });

        // Execute hook for list operation if available
        if (extra?.sdk.callHook) {
            const hookResult = await extra.sdk.callHook('blog:onList', {data: blogs});
            if (hookResult?.data) {
                blogs = hookResult.data;
            }
        }

        const paginatedResponse: PaginatedResponse<Blog> = {
            data: blogs,
            page,
            limit
        };

        throw new Success("Blogs retrieved successfully", paginatedResponse);
    } catch (error) {
        if (error instanceof Success) throw error;

        console.error("Error fetching blogs:", error);
        throw new DatabaseError("Failed to retrieve blogs: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'blogs:list'});

// Get a single blog by ID
export const getBlogById = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    const db = extra.sdk.db;
    const blogId = request._params?.id;

    try {
        let blog = await db.blogs.findOne({_id: blogId});

        if (!blog) {
            throw new NotFound(`Blog with id ${blogId} not found`);
        }

        // Execute hook for read operation
        const hookResult = await extra.sdk.callHook('blog:onRead', {blogId: blog._id, data: blog});
        if (hookResult?.data) {
            blog = hookResult.data;
        }

        throw new Success("Blog retrieved successfully", blog);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound) throw error;

        console.error(`Error fetching blog ${blogId}:`, error);
        throw new DatabaseError("Failed to retrieve blog: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'blogs:read'});

// Create a new blog
export const createBlog = secure(async (session: SessionData, request: MinimumRequest<any, Partial<BlogData>>, extra: ApiExtra) => {
    const db = extra.sdk.db;
    const rawBody = request.body as any;

    try {

        let data = filterKeys<BlogData>(rawBody, BLOG_CREATE_FIELDS);
        // Validate required fields
        if (!data.title) {
            throw new ValidationError("Blog title is required");
        }

        if (!data.content) {
            throw new ValidationError("Blog content is required");
        }

        // Execute before create hook
        const beforeResult = await extra.sdk.callHook('blog:beforeCreate', {
            title: data.title,
            content: data.content,
            data: data
        });
        if (beforeResult?.data) {
            data = filterKeys<BlogData>(beforeResult.data, BLOG_CREATE_FIELDS);
        }

        const extras = {
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const cleanedBody = filterKeys<BlogData>({
            ...data,
            ...extras,
            userId: session.user._id
        }, BLOG_CREATE_FIELDS);

        const creation = await db.blogs.create(cleanedBody as BlogData);

        await extra.sdk.callHook('blog:afterCreate', {
            blogId: creation._id,
            data: creation
        });

        extra.configuration.callbacks?.on?.("createBlog", creation);

        throw new Success("Blog created successfully", creation);
    } catch (error) {
        if (error instanceof Success || error instanceof ValidationError) throw error;

        console.error("Error creating blog:", error);
        throw new DatabaseError("Failed to create blog: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'blogs:create'});

// Update a blog
export const updateBlog = secure(async (session: SessionData, request: MinimumRequest<any, Partial<Blog>>, extra: ApiExtra) => {
    const db = extra.sdk.db;
    const blogId = request._params?.id;
    const rawBody = request.body as any;

    try {
        // Filter to only allowed fields
        let body = filterKeys<BlogData>(rawBody, BLOG_UPDATE_FIELDS);

        const extras = {updatedAt: Date.now()};

        // Check if blog exists first
        const existingBlog = await db.blogs.findOne({_id: blogId});
        if (!existingBlog) {
            throw new NotFound(`Blog with id ${blogId} not found`);
        }

        // Check if user is trying to update someone else's blog
        // Users with 'all:all' or 'blogs:all' can update any blog
        const canUpdateAnyBlog = session.user.permissions.some((p: Permission) => p === 'all:all' || p === 'blogs:all');

        if (!canUpdateAnyBlog && existingBlog.userId !== session.user._id) {
            throw new BadRequest("You can only update your own blogs");
        }

        // Execute before update hook
        const beforeResult = await extra.sdk.callHook('blog:beforeUpdate', {
            blogId: blogId!,
            updates: body,
            previousData: existingBlog
        });
        if (beforeResult?.updates) {
            body = filterKeys<BlogData>(beforeResult.updates, BLOG_UPDATE_FIELDS);
        }

        const updation = await db.blogs.updateOne(
            {_id: blogId},
            {...body, ...extras, userId: existingBlog.userId}
        );

        // Execute after update hook
        await extra.sdk.callHook('blog:afterUpdate', {
            blogId: blogId!,
            data: updation,
            previousData: existingBlog
        });

        extra.configuration.callbacks?.on?.("updateBlog", updation);

        throw new Success("Blog updated successfully", updation);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound || error instanceof BadRequest) throw error;

        console.error(`Error updating blog ${blogId}:`, error);
        throw new DatabaseError("Failed to update blog: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'blogs:update'});

// Delete a blog
export const deleteBlog = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra) => {
    const db = extra.sdk.db;
    const blogId = request._params?.id;

    try {
        // Check if blog exists first
        const existingBlog = await db.blogs.findOne({_id: blogId});
        if (!existingBlog) {
            throw new NotFound(`Blog with id ${blogId} not found`);
        }

        // Check if user is trying to delete someone else's blog
        // Users with 'all:all' or 'blogs:all' can delete any blog
        const canDeleteAnyBlog = session.user.permissions.some((p: Permission) =>
            p === 'all:all' || p === 'blogs:all'
        );

        if (!canDeleteAnyBlog && existingBlog.userId !== session.user._id) {
            throw new BadRequest("You can only delete your own blogs");
        }

        // Execute before delete hook
        const beforeResult = await extra.sdk.callHook('blog:beforeDelete', {
            blogId: blogId!,
            data: existingBlog
        });
        if (beforeResult?.cancel) {
            throw new BadRequest("Blog deletion cancelled by plugin");
        }

        const deletion = await db.blogs.deleteOne({_id: blogId});

        // Execute after delete hook
        await extra.sdk.callHook('blog:afterDelete', {
            blogId: blogId!,
            previousData: existingBlog
        });

        extra.configuration.callbacks?.on?.("deleteBlog", deletion);

        throw new Success("Blog deleted successfully", deletion);
    } catch (error) {
        if (error instanceof Success || error instanceof NotFound || error instanceof BadRequest) throw error;

        console.error(`Error deleting blog ${blogId}:`, error);
        throw new DatabaseError("Failed to delete blog: " + (error instanceof Error ? error.message : String(error)));
    }
}, {requirePermission: 'blogs:delete'});