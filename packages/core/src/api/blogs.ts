import {CNextRequest, Permission} from "../types";
import secure from "../utils/secureInternal";
import {
    NotFound,
    Success,
    ValidationError,
    DatabaseError,
    BadRequest
} from "../utils/errors";
import {CreateBlogInput} from "@supergrowthai/next-blog-dashboard";

// List all blogs - requires 'blogs:list' permission
export const getBlogs = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            const blogs = await db.blogs.find({});
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

        try {
            const blog = await db.blogs.findOne({_id: request._params.id});

            if (!blog) {
                throw new NotFound(`Blog with id ${request._params.id} not found`);
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

        try {
            const body: CreateBlogInput = await request.json();

            // Validate required fields
            if (!body.title) {
                throw new ValidationError("Blog title is required");
            }

            if (!body.content) {
                throw new ValidationError("Blog content is required");
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

        try {
            const body = await request.json();
            const extras = {updatedAt: Date.now()};

            // Check if blog exists first
            const existingBlog = await db.blogs.findOne({_id: request._params.id});
            if (!existingBlog) {
                throw new NotFound(`Blog with id ${request._params.id} not found`);
            }

            // Check if user is trying to update someone else's blog
            // Users with 'all:all' or 'blogs:all' can update any blog
            const canUpdateAnyBlog = request.sessionUser.permissions.some(p => p === 'all:all' || p === 'blogs:all');

            if (!canUpdateAnyBlog && existingBlog.userId !== request.sessionUser._id) {
                throw new BadRequest("You can only update your own blogs");
            }

            const updation = await db.blogs.updateOne(
                {_id: request._params.id},
                {...body, ...extras, userId: existingBlog.userId}
            );

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

// Delete a blog - requires either 'blogs:delete' or both 'blogs:all' and 'all:delete' permissions
export const deleteBlog = secure(
    async (request: CNextRequest) => {
        const db = await request.db();

        try {
            // Check if blog exists first
            const existingBlog = await db.blogs.findOne({_id: request._params.id});
            if (!existingBlog) {
                throw new NotFound(`Blog with id ${request._params.id} not found`);
            }

            // Check if user is trying to delete someone else's blog
            // Users with 'all:all' or 'blogs:all' can delete any blog
            const canDeleteAnyBlog = request.sessionUser.permissions.some(p =>
                p === 'all:all' || p === 'blogs:all'
            );

            if (!canDeleteAnyBlog && existingBlog.userId !== request.sessionUser._id) {
                throw new BadRequest("You can only delete your own blogs");
            }

            const deletion = await db.blogs.deleteOne({_id: request._params.id});
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