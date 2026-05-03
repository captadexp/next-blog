import type { MCPTool, MCPContext } from "../types";

/**
 * Helper function to make HTTP requests to the blog API
 */
async function callBlogAPI(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: any,
  apiKey?: string
) {
  const baseURL = process.env.MCP_BLOG_API_URL || "http://localhost:3000";
  const url = `${baseURL}${endpoint}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Pass MCP API key as authorization if available
  if (apiKey) {
    headers["X-MCP-Key"] = apiKey;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = (await response.json()) as Record<string, any>;

    if (!response.ok) {
      throw new Error(
        (data?.error as string) || `API error: ${response.status} ${response.statusText}`
      );
    }

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Blog API error: ${message}`);
  }
}

/**
 * Publish Blog Tool - Create a new blog post
 */
export const publishBlogTool: MCPTool = {
  name: "publish_blog",
  description: "Publish a new blog post with title, content, and metadata",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Blog post title",
      },
      content: {
        type: "string",
        description: "Blog post content (markdown)",
      },
      slug: {
        type: "string",
        description: "URL-friendly slug",
      },
      excerpt: {
        type: "string",
        description: "Short excerpt or summary",
      },
      categories: {
        type: "array",
        items: { type: "string" },
        description: "List of category IDs",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "List of tags",
      },
      featured: {
        type: "boolean",
        description: "Mark as featured",
      },
      status: {
        type: "string",
        enum: ["draft", "published"],
        description: "Publication status",
      },
    },
    required: ["title", "content"],
  },
  handler: async (params: unknown, _context: MCPContext) => {
    const p = params as any;

    try {
      console.log("[Tool] 📤 Publishing blog post:", p.title);

      const response = await callBlogAPI("/api/next-blog/blogs", "POST", {
        title: p.title,
        content: p.content,
        slug: p.slug,
        excerpt: p.excerpt,
        categories: p.categories,
        tags: p.tags,
        featured: p.featured,
        status: p.status || "draft",
      }) as Record<string, any>;

      console.log("[Tool] ✅ Blog published successfully");
      return {
        success: true,
        blogId: (response.data as Record<string, any>)?._id || (response.data as Record<string, any>)?.id,
        blog: response.data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Tool] Error publishing blog:", message);
      return { success: false, error: message };
    }
  },
};

/**
 * Get Blog Tool - Retrieve a specific blog by ID
 */
export const getBlogTool: MCPTool = {
  name: "get_blog",
  description: "Retrieve a blog post by ID",
  inputSchema: {
    type: "object",
    properties: {
      blogId: {
        type: "string",
        description: "The blog ID to retrieve",
      },
    },
    required: ["blogId"],
  },
  handler: async (params: unknown, _context: MCPContext) => {
    const p = params as any;

    try {
      console.log("[Tool] 📖 Fetching blog:", p.blogId);

      const response = await callBlogAPI(`/api/next-blog/blogs/${p.blogId}`) as Record<string, any>;

      console.log("[Tool] ✅ Blog retrieved successfully");
      return {
        success: true,
        blog: response.data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Tool] Error fetching blog:", message);
      return { success: false, error: message };
    }
  },
};

/**
 * List Blogs Tool - List all blogs with pagination
 */
export const listBlogsTool: MCPTool = {
  name: "list_blogs",
  description: "List all blog posts with optional pagination",
  inputSchema: {
    type: "object",
    properties: {
      page: {
        type: "number",
        description: "Page number (default: 1)",
      },
      limit: {
        type: "number",
        description: "Items per page (default: 10)",
      },
    },
    required: [],
  },
  handler: async (params: unknown, _context: MCPContext) => {
    const p = params as any;

    try {
      console.log("[Tool] 📚 Listing blogs...");

      const query = new URLSearchParams();
      if (p.page) query.append("page", String(p.page));
      if (p.limit) query.append("limit", String(p.limit));

      const response = await callBlogAPI(
        `/api/next-blog/blogs?${query.toString()}`
      ) as Record<string, any>;

      console.log("[Tool] ✅ Blogs listed successfully");
      return {
        success: true,
        blogs: response.data,
        page: p.page || 1,
        limit: p.limit || 10,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Tool] Error listing blogs:", message);
      return { success: false, error: message };
    }
  },
};

/**
 * Update Blog Tool - Update an existing blog post
 */
export const updateBlogTool: MCPTool = {
  name: "update_blog",
  description: "Update an existing blog post",
  inputSchema: {
    type: "object",
    properties: {
      blogId: {
        type: "string",
        description: "The blog ID to update",
      },
      title: {
        type: "string",
        description: "Blog post title",
      },
      content: {
        type: "string",
        description: "Blog post content (markdown)",
      },
      slug: {
        type: "string",
        description: "URL-friendly slug",
      },
      excerpt: {
        type: "string",
        description: "Short excerpt or summary",
      },
      categories: {
        type: "array",
        items: { type: "string" },
        description: "List of category IDs",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "List of tags",
      },
      featured: {
        type: "boolean",
        description: "Mark as featured",
      },
      status: {
        type: "string",
        enum: ["draft", "published"],
        description: "Publication status",
      },
    },
    required: ["blogId"],
  },
  handler: async (params: unknown, _context: MCPContext) => {
    const p = params as any;
    const { blogId, ...updateData } = p;

    try {
      console.log("[Tool] ✏️ Updating blog:", blogId);

      const response = await callBlogAPI(
        `/api/next-blog/blogs/${blogId}`,
        "PUT",
        updateData
      ) as Record<string, any>;

      console.log("[Tool] ✅ Blog updated successfully");
      return {
        success: true,
        blogId,
        blog: response.data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Tool] Error updating blog:", message);
      return { success: false, error: message };
    }
  },
};

/**
 * Delete Blog Tool - Delete a blog post
 */
export const deleteBlogTool: MCPTool = {
  name: "delete_blog",
  description: "Delete a blog post by ID",
  inputSchema: {
    type: "object",
    properties: {
      blogId: {
        type: "string",
        description: "The blog ID to delete",
      },
    },
    required: ["blogId"],
  },
  handler: async (params: unknown, _context: MCPContext) => {
    const p = params as any;

    try {
      console.log("[Tool] 🗑️ Deleting blog:", p.blogId);

      const response = await callBlogAPI(
        `/api/next-blog/blogs/${p.blogId}`,
        "DELETE"
      );

      console.log("[Tool] ✅ Blog deleted successfully");
      return {
        success: true,
        blogId: p.blogId,
        message: "Blog deleted successfully",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Tool] Error deleting blog:", message);
      return { success: false, error: message };
    }
  },
};

/**
 * CRUD tools array for registration
 */
export const crudTools: MCPTool[] = [
  publishBlogTool,
  getBlogTool,
  listBlogsTool,
  updateBlogTool,
  deleteBlogTool,
];
