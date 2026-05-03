import type { MCPTool, MCPContext } from "../types";
import { ClaudeContentGenerator } from "../claude";
import { crudTools } from "./crud-tools";

// Initialize Claude generator (API key from environment)
const claudeApiKey = process.env.ANTHROPIC_API_KEY;
const claude = claudeApiKey
  ? new ClaudeContentGenerator({ apiKey: claudeApiKey })
  : null;

if (!claudeApiKey) {
  console.warn(
    "[MCP] ⚠️  ANTHROPIC_API_KEY not set. Claude tools will not work."
  );
}

/**
 * Generate Blog Post Tool - Uses Claude API
 */
export const generateBlogPostTool: MCPTool = {
  name: "generate_blog_post",
  description: "Generate a new blog post based on topic, style, and requirements",
  inputSchema: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description: "Main topic or subject of the blog post",
      },
      style: {
        type: "string",
        enum: ["formal", "casual", "technical", "conversational"],
        description: "Writing style for the post",
      },
      targetLength: {
        type: "number",
        description: "Target word count (optional, default 1500)",
      },
      keywords: {
        type: "string",
        description: "SEO keywords to include (comma-separated)",
      },
    },
    required: ["topic", "style"],
  },
  handler: async (params: unknown, _context: MCPContext) => {
    if (!claude) {
      return {
        error: "Claude API not configured. Set ANTHROPIC_API_KEY environment variable.",
      };
    }

    const p = params as any;
    console.log("[Tool] 🚀 Generating blog post about:", p.topic);

    try {
      const content = await claude.generateBlogPost({
        topic: p.topic,
        style: p.style,
        targetLength: p.targetLength,
        keywords: p.keywords,
      });

      return {
        success: true,
        content,
        metadata: {
          topic: p.topic,
          style: p.style,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Tool] Error generating blog post:", message);
      return { error: message };
    }
  },
};

/**
 * Edit Blog Post Tool - Uses Claude API
 */
export const editBlogPostTool: MCPTool = {
  name: "edit_blog_post",
  description: "Edit an existing blog post with specific changes or improvements",
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "The blog post content to edit",
      },
      section: {
        type: "string",
        description: "Section to edit (title, introduction, body, conclusion, all)",
      },
      instructions: {
        type: "string",
        description: "What changes to make",
      },
    },
    required: ["content", "instructions"],
  },
  handler: async (params: unknown, _context: MCPContext) => {
    if (!claude) {
      return {
        error: "Claude API not configured. Set ANTHROPIC_API_KEY environment variable.",
      };
    }

    const p = params as any;
    console.log("[Tool] ✏️  Editing blog post");

    try {
      const editedContent = await claude.editBlogPost({
        content: p.content,
        section: p.section,
        instructions: p.instructions,
      });

      return {
        success: true,
        content: editedContent,
        metadata: {
          section: p.section || "all",
          instructions: p.instructions,
          editedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Tool] Error editing blog post:", message);
      return { error: message };
    }
  },
};

/**
 * Suggest Improvements Tool - Uses Claude API
 */
export const suggestImprovementsTool: MCPTool = {
  name: "suggest_improvements",
  description: "Get AI suggestions for improving an existing blog post",
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "The blog post content to review",
      },
      focus: {
        type: "string",
        enum: ["clarity", "engagement", "seo", "structure", "all"],
        description: "What aspect to focus on",
      },
    },
    required: ["content"],
  },
  handler: async (params: unknown, _context: MCPContext) => {
    if (!claude) {
      return {
        error: "Claude API not configured. Set ANTHROPIC_API_KEY environment variable.",
      };
    }

    const p = params as any;
    console.log("[Tool] 💡 Generating improvement suggestions");

    try {
      const suggestions = await claude.suggestImprovements({
        content: p.content,
        focus: p.focus,
      });

      return {
        success: true,
        suggestions,
        metadata: {
          focus: p.focus || "all",
          suggestionCount: suggestions.length,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Tool] Error generating suggestions:", message);
      return { error: message };
    }
  },
};

/**
 * Generate SEO Metadata Tool - Uses Claude API
 */
export const generateSEOMetadataTool: MCPTool = {
  name: "generate_seo_metadata",
  description: "Generate SEO metadata (title, description, keywords) for a blog post",
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "The blog post content",
      },
      targetKeywords: {
        type: "string",
        description: "Primary keywords to optimize for (comma-separated)",
      },
    },
    required: ["content"],
  },
  handler: async (params: unknown, _context: MCPContext) => {
    if (!claude) {
      return {
        error: "Claude API not configured. Set ANTHROPIC_API_KEY environment variable.",
      };
    }

    const p = params as any;
    console.log("[Tool] 🔍 Generating SEO metadata");

    try {
      const metadata = await claude.generateSEOMetadata({
        content: p.content,
        targetKeywords: p.targetKeywords,
      });

      return {
        success: true,
        metadata,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Tool] Error generating SEO metadata:", message);
      return { error: message };
    }
  },
};

/**
 * Tool registry array
 * Used by MCPBlogServer.registerTool() to register all tools
 */
export const blogTools: MCPTool[] = [
  // Content generation tools
  generateBlogPostTool,
  editBlogPostTool,
  suggestImprovementsTool,
  generateSEOMetadataTool,
  // CRUD tools for blog management
  ...crudTools,
];

// Export CRUD tools individually for direct access
export { publishBlogTool, getBlogTool, listBlogsTool, updateBlogTool, deleteBlogTool } from "./crud-tools";
