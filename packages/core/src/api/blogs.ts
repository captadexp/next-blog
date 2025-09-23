import {Permission} from "@supergrowthai/types/server";
import secure, {type CNextRequest} from "../utils/secureInternal.js";
import {BadRequest, DatabaseError, NotFound, Success, ValidationError} from "../utils/errors.js";

// List all blogs - requires 'blogs:list' permission
export const getBlogs = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const sdk = (request as any).sdk;

        try {
            let blogs = await db.blogs.find({});
            
            // Execute hook for list operation
            if (sdk?.callHook) {
                const hookResult = await sdk.callHook('blog:onList', { filters: {}, data: blogs });
                if (hookResult?.data) {
                    blogs = hookResult.data;
                }
            }
            
            throw new Success("Blogs retrieved successfully", blogs);
        } catch (error) {
            if (error instanceof Success) throw error;

            console.error("Error fetching blogs:", error);
            throw new DatabaseError("Failed to retrieve blogs: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'blogs:list'}
);

// Get a single blog by ID - requires 'blogs:read' permission
export const getBlogById = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const sdk = (request as any).sdk;

        try {
            let blog = await db.blogs.findOne({_id: request._params.id});

            if (!blog) {
                throw new NotFound(`Blog with id ${request._params.id} not found`);
            }

            // Execute hook for read operation
            if (sdk?.callHook) {
                const hookResult = await sdk.callHook('blog:onRead', { blogId: blog._id, data: blog });
                if (hookResult?.data) {
                    blog = hookResult.data;
                }
            }

            throw new Success("Blog retrieved successfully", blog);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound) throw error;

            console.error(`Error fetching blog ${request._params.id}:`, error);
            throw new DatabaseError("Failed to retrieve blog: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'blogs:read'}
);

// Create a new blog - requires 'blogs:create' permission
export const createBlog = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const sdk = (request as any).sdk;

        try {
            let body: any = await request.json();

            // Validate required fields
            if (!body.title) {
                throw new ValidationError("Blog title is required");
            }

            if (!body.content) {
                throw new ValidationError("Blog content is required");
            }

            // Execute before create hook
            if (sdk?.callHook) {
                const beforeResult = await sdk.callHook('blog:beforeCreate', {
                    title: body.title,
                    content: body.content,
                    data: body
                });
                if (beforeResult) {
                    body = { ...body, ...beforeResult };
                }
            }

            const extras = {
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            const creation = await db.blogs.create({
                ...body,
                ...extras,
                userId: request.sessionUser._id
            });

            // Execute after create hook
            if (sdk?.callHook) {
                await sdk.callHook('blog:afterCreate', {
                    blogId: creation._id,
                    data: creation
                });
            }

            request.configuration.callbacks?.on?.("createBlog", creation);
            throw new Success("Blog created successfully", creation);
        } catch (error) {
            if (error instanceof Success || error instanceof ValidationError) throw error;

            console.error("Error creating blog:", error);
            throw new DatabaseError("Failed to create blog: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'blogs:create'}
);

// Update a blog - requires 'blogs:update' permission
export const updateBlog = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const sdk = (request as any).sdk;

        try {
            let body: any = await request.json();
            const extras = {updatedAt: Date.now()};

            // Check if blog exists first
            const existingBlog = await db.blogs.findOne({_id: request._params.id});
            if (!existingBlog) {
                throw new NotFound(`Blog with id ${request._params.id} not found`);
            }

            // Check if user is trying to update someone else's blog
            // Users with 'all:all' or 'blogs:all' can update any blog
            const canUpdateAnyBlog = request.sessionUser.permissions.some((p: Permission) => p === 'all:all' || p === 'blogs:all');

            if (!canUpdateAnyBlog && existingBlog.userId !== request.sessionUser._id) {
                throw new BadRequest("You can only update your own blogs");
            }

            // Execute before update hook
            if (sdk?.callHook) {
                const beforeResult = await sdk.callHook('blog:beforeUpdate', {
                    blogId: request._params.id,
                    updates: body,
                    previousData: existingBlog
                });
                if (beforeResult?.updates) {
                    body = beforeResult.updates;
                }
            }

            const updation = await db.blogs.updateOne(
                {_id: request._params.id},
                {...body, ...extras, userId: existingBlog.userId}
            );

            // Execute after update hook
            if (sdk?.callHook) {
                await sdk.callHook('blog:afterUpdate', {
                    blogId: request._params.id,
                    data: updation,
                    previousData: existingBlog
                });
            }

            request.configuration.callbacks?.on?.("updateBlog", updation);
            throw new Success("Blog updated successfully", updation);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound || error instanceof ValidationError) throw error;

            console.error(`Error updating blog ${request._params.id}:`, error);
            throw new DatabaseError("Failed to update blog: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'blogs:update'}
);

// Update blog metadata - requires 'blogs:update-metadata' permission
export const updateBlogMetadata = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const blogId = request._params.id;

        if (!blogId) {
            throw new ValidationError("Blog ID is required");
        }

        try {
            const body: any = await request.json();
            const metadata = body.metadata;

            if (!metadata) {
                throw new ValidationError("Metadata is required");
            }

            //fixme type fix remove any
            const existingBlog: any = await db.blogs.findOne({_id: blogId});
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

            request.configuration.callbacks?.on?.("updateBlog", updation);
            throw new Success("Blog metadata updated successfully", updation);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound || error instanceof ValidationError) throw error;

            console.error(`Error updating blog metadata for blog ${request._params.id}:`, error);
            throw new DatabaseError("Failed to update blog metadata: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requirePermission: 'blogs:update'}
);

// Delete a blog - requires either 'blogs:delete' or both 'blogs:all' and 'all:delete' permissions
export const deleteBlog = secure(
    async (request: CNextRequest) => {
        const db = await request.db();
        const sdk = (request as any).sdk;

        try {
            // Check if blog exists first
            const existingBlog = await db.blogs.findOne({_id: request._params.id});
            if (!existingBlog) {
                throw new NotFound(`Blog with id ${request._params.id} not found`);
            }

            // Check if user is trying to delete someone else's blog
            // Users with 'all:all' or 'blogs:all' can delete any blog
            const canDeleteAnyBlog = request.sessionUser.permissions.some((p: Permission) =>
                p === 'all:all' || p === 'blogs:all'
            );

            if (!canDeleteAnyBlog && existingBlog.userId !== request.sessionUser._id) {
                throw new BadRequest("You can only delete your own blogs");
            }

            // Execute before delete hook
            if (sdk?.callHook) {
                const beforeResult = await sdk.callHook('blog:beforeDelete', {
                    blogId: request._params.id,
                    data: existingBlog
                });
                if (beforeResult?.cancel) {
                    throw new BadRequest("Blog deletion cancelled by plugin");
                }
            }

            const deletion = await db.blogs.deleteOne({_id: request._params.id});
            
            // Execute after delete hook
            if (sdk?.callHook) {
                await sdk.callHook('blog:afterDelete', {
                    blogId: request._params.id,
                    previousData: existingBlog
                });
            }
            
            request.configuration.callbacks?.on?.("deleteBlog", deletion);
            throw new Success("Blog deleted successfully", deletion);
        } catch (error) {
            if (error instanceof Success || error instanceof NotFound) throw error;

            console.error(`Error deleting blog ${request._params.id}:`, error);
            throw new DatabaseError("Failed to delete blog: " + (error instanceof Error ? error.message : String(error)));
        }
    },
    {requireAnyPermission: ['blogs:delete', 'all:delete']}
);