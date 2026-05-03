/**
 * @supergrowthai/mcp-blog-writer
 * 
 * MCP (Model Context Protocol) server for AI-assisted blog writing
 * 
 * Usage:
 * ```typescript
 * import { MCPBlogServer } from "@supergrowthai/mcp-blog-writer";
 * import { blogTools } from "@supergrowthai/mcp-blog-writer/tools";
 * 
 * const server = new MCPBlogServer({
 *   apiKey: process.env.MCP_API_KEY!,
 * });
 * 
 * blogTools.forEach(tool => server.registerTool(tool));
 * ```
 */

// Main server
export { MCPBlogServer } from "./server";

// Authentication
export { MCPAuthHandler } from "./auth/mcp-auth";

// Types
export type {
  MCPTool,
  MCPContext,
  MCPServerConfig,
  ToolRegistry,
  MCPRequest,
  MCPResponse,
  MCPBlogDetails,
} from "./types";

// Tools (content generation and CRUD)
export {
  blogTools,
  generateBlogPostTool,
  editBlogPostTool,
  suggestImprovementsTool,
  generateSEOMetadataTool,
  publishBlogTool,
  getBlogTool,
  listBlogsTool,
  updateBlogTool,
  deleteBlogTool,
} from "./tools/index";
