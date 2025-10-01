import type {MinimumRequest, OneApiFunctionResponse, SessionData} from "@supergrowthai/oneapi/types";
import {Blog, BlogData, Permission} from "@supergrowthai/types/server";
import secure from "../utils/secureInternal.js";
import type {ApiExtra} from "../types/api.js";
import {BadRequest, NotFound} from "@supergrowthai/oneapi";

// List all blogs
export const getBlogs = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = await extra.db();

    try {
        let blogs = await db.blogs.find({});

        // Execute hook for list operation if available
        if (extra?.callHook) {
            const hookResult = await extra.callHook('blog:onList', {filters: {}, data: blogs});
            if (hookResult?.data) {
                blogs = hookResult.data;
            }
        }

        return {
            code: 0,
            message: "Blogs retrieved successfully",
            payload: blogs
        };
    } catch (error) {
        console.error("Error fetching blogs:", error);
        return {
            code: 500,
            message: "Failed to retrieve blogs: " + (error instanceof Error ? error.message : String(error))
        };
    }
}, {requirePermission: 'blogs:list'});

// Get a single blog by ID
export const getBlogById = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = await extra.db();
    const blogId = request._params?.id;

    if (!blogId) {
        throw new BadRequest("Blog ID is required");
    }

    try {
        let blog = await db.blogs.findOne({_id: blogId});

        if (!blog) {
            throw new NotFound(`Blog with id ${blogId} not found`);
        }

        // Execute hook for read operation
        if (extra?.callHook) {
            const hookResult = await extra.callHook('blog:onRead', {blogId: blog._id, data: blog});
            if (hookResult?.data) {
                blog = hookResult.data;
            }
        }

        return {
            code: 0,
            message: "Blog retrieved successfully",
            payload: blog
        };
    } catch (error) {
        if (error instanceof NotFound) throw error;

        console.error(`Error fetching blog ${blogId}:`, error);
        return {
            code: 500,
            message: "Failed to retrieve blog: " + (error instanceof Error ? error.message : String(error))
        };
    }
}, {requirePermission: 'blogs:read'});

// Create a new blog
export const createBlog = secure(async (session: SessionData, request: MinimumRequest<any, Partial<BlogData>>, extra: ApiExtra): Promise<OneApiFunctionResponse<Blog>> => {
    const db = await extra.db();
    let body = request.body as Partial<BlogData>;

    try {
        // Validate required fields
        if (!body.title) {
            throw new BadRequest("Blog title is required");
        }

        if (!body.content) {
            throw new BadRequest("Blog content is required");
        }

        // Execute before create hook
        if (extra?.callHook) {
            const beforeResult = await extra.callHook('blog:beforeCreate', {
                title: body.title,
                content: body.content,
                data: body
            });
            if (beforeResult) {
                body = {...body, ...beforeResult};
            }
        }

        const extras = {
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const creation = await db.blogs.create({
            ...body,
            ...extras,
            userId: session.user._id
        } as BlogData);

        // Execute after create hook
        if (extra?.callHook) {
            await extra.callHook('blog:afterCreate', {
                blogId: creation._id,
                data: creation
            });
        }

        extra.configuration.callbacks?.on?.("createBlog", creation);

        return {
            code: 0,
            message: "Blog created successfully",
            payload: creation
        };
    } catch (error) {
        if (error instanceof BadRequest) throw error;

        console.error("Error creating blog:", error);
        return {
            code: 500,
            message: "Failed to create blog: " + (error instanceof Error ? error.message : String(error))
        };
    }
}, {requirePermission: 'blogs:create'});

// Update a blog
export const updateBlog = secure(async (session: SessionData, request: MinimumRequest<any, Partial<Blog>>, extra: ApiExtra): Promise<OneApiFunctionResponse<Blog | null>> => {
    const db = await extra.db();
    const blogId = request._params?.id;
    let body = request.body as Partial<Blog>;

    if (!blogId) {
        throw new BadRequest("Blog ID is required");
    }

    try {
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
        if (extra?.callHook) {
            const beforeResult = await extra.callHook('blog:beforeUpdate', {
                blogId: blogId,
                updates: body,
                previousData: existingBlog
            });
            if (beforeResult?.updates) {
                body = beforeResult.updates;
            }
        }

        const updation = await db.blogs.updateOne(
            {_id: blogId},
            {...body, ...extras, userId: existingBlog.userId}
        );

        // Execute after update hook
        if (extra?.callHook) {
            await extra.callHook('blog:afterUpdate', {
                blogId: blogId,
                data: updation,
                previousData: existingBlog
            });
        }

        extra.configuration.callbacks?.on?.("updateBlog", updation);

        return {
            code: 0,
            message: "Blog updated successfully",
            payload: updation
        };
    } catch (error) {
        if (error instanceof NotFound || error instanceof BadRequest) throw error;

        console.error(`Error updating blog ${blogId}:`, error);
        return {
            code: 500,
            message: "Failed to update blog: " + (error instanceof Error ? error.message : String(error))
        };
    }
}, {requirePermission: 'blogs:update'});

// Update blog metadata
export const updateBlogMetadata = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = await extra.db();
    const blogId = request._params?.id;

    if (!blogId) {
        throw new BadRequest("Blog ID is required");
    }

    try {
        const body = request.body as { metadata?: Record<string, unknown> };
        const metadata = body.metadata;

        if (!metadata) {
            throw new BadRequest("Metadata is required");
        }

        const existingBlog = await db.blogs.findOne({_id: blogId}) as (Blog & {
            metadata?: Record<string, unknown>
        }) | null;
        if (!existingBlog) {
            throw new NotFound(`Blog with id ${blogId} not found`);
        }

        // Merge existing metadata with new metadata
        const updatedMetadata = {
            ...existingBlog.metadata,
            ...metadata
        };

        const updation = await db.blogs.updateOne(
            {_id: blogId},
            {metadata: updatedMetadata, updatedAt: Date.now()}
        );

        extra.configuration.callbacks?.on?.("updateBlog", updation);

        return {
            code: 0,
            message: "Blog metadata updated successfully",
            payload: updation
        };
    } catch (error) {
        if (error instanceof NotFound || error instanceof BadRequest) throw error;

        console.error(`Error updating blog metadata for blog ${blogId}:`, error);
        return {
            code: 500,
            message: "Failed to update blog metadata: " + (error instanceof Error ? error.message : String(error))
        };
    }
}, {requirePermission: 'blogs:update'});

// Delete a blog
export const deleteBlog = secure(async (session: SessionData, request: MinimumRequest, extra: ApiExtra): Promise<OneApiFunctionResponse> => {
    const db = await extra.db();
    const blogId = request._params?.id;

    if (!blogId) {
        throw new BadRequest("Blog ID is required");
    }

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
        if (extra?.callHook) {
            const beforeResult = await extra.callHook('blog:beforeDelete', {
                blogId: blogId,
                data: existingBlog
            });
            if (beforeResult?.cancel) {
                throw new BadRequest("Blog deletion cancelled by plugin");
            }
        }

        const deletion = await db.blogs.deleteOne({_id: blogId});

        // Execute after delete hook
        if (extra?.callHook) {
            await extra.callHook('blog:afterDelete', {
                blogId: blogId,
                previousData: existingBlog
            });
        }

        extra.configuration.callbacks?.on?.("deleteBlog", deletion);

        return {
            code: 0,
            message: "Blog deleted successfully",
            payload: deletion
        };
    } catch (error) {
        if (error instanceof NotFound || error instanceof BadRequest) throw error;

        console.error(`Error deleting blog ${blogId}:`, error);
        return {
            code: 500,
            message: "Failed to delete blog: " + (error instanceof Error ? error.message : String(error))
        };
    }
}, {requireAnyPermission: ['blogs:delete', 'all:delete']});