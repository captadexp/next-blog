import type { MCPTool, MCPContext, MCPServerConfig, ToolRegistry, MCPRequest, MCPResponse } from "./types";
import { MCPAuthHandler } from "./auth/mcp-auth";
import type { OneApiRequest, OneApiResponse } from "@supergrowthai/oneapi";

/**
 * MCPBlogServer - Core MCP server for AI-assisted blog writing
 * 
 * Handles:
 * - Authentication via MCPAuthHandler
 * - Tool registration and discovery
 * - Request routing to tool handlers
 * - Error handling and response formatting
 */
export class MCPBlogServer {
  private authHandler: MCPAuthHandler;
  private tools: Map<string, MCPTool> = new Map();

  constructor(config: MCPServerConfig) {
    this.authHandler = new MCPAuthHandler(config.apiKey);
  }

  /**
   * Register a tool with the server
   * Example: server.registerTool(generateBlogPostTool)
   */
  registerTool(tool: MCPTool): void {
    if (!tool.name || !tool.description || !tool.handler || !tool.inputSchema) {
      throw new Error(`Invalid tool definition for ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
    console.log(`[MCP] Registered tool: ${tool.name}`);
  }

  /**
   * Get all registered tools
   */
  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Main handler for incoming MCP requests
   * 1. Validates authentication
   * 2. Looks up tool
   * 3. Executes tool handler
   * 4. Returns formatted response
   */
  async handleRequest(
    req: OneApiRequest,
    request: MCPRequest,
    res?: OneApiResponse
  ): Promise<MCPResponse> {
    try {
      // Step 1: Authenticate request
      const user = await this.authHandler.getUser(req, res);
      if (!user) {
        return {
          success: false,
          error: "Unauthorized - invalid or missing API key",
        };
      }

      // Step 2: Get session
      const session = await this.authHandler.getSession(req, res);

      // Step 3: Build context
      const context: MCPContext = {
        user,
        session,
      };

      // Step 4: Look up tool
      const tool = this.getTool(request.tool);
      if (!tool) {
        return {
          success: false,
          error: `Tool not found: ${request.tool}. Available tools: ${Array.from(this.tools.keys()).join(", ")}`,
        };
      }

      // Step 5: Validate input against schema
      const validation = this.validateInput(request.params, tool.inputSchema);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid input: ${validation.error}`,
        };
      }

      // Step 6: Execute tool handler
      console.log(`[MCP] Executing tool: ${tool.name}`);
      const result = await tool.handler(request.params, context);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[MCP] Request error:`, message);
      return {
        success: false,
        error: `Internal error: ${message}`,
      };
    }
  }

  /**
   * Simple input validation against JSON schema
   * Extended validation can be added later with ajv
   */
  private validateInput(
    params: unknown,
    schema: { type: "object"; properties: Record<string, any>; required: string[] }
  ): { valid: boolean; error?: string } {
    if (typeof params !== "object" || params === null) {
      return { valid: false, error: "Input must be an object" };
    }

    const obj = params as Record<string, any>;

    // Check required fields
    for (const field of schema.required) {
      if (!(field in obj)) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    return { valid: true };
  }

  /**
   * Get server metadata (tools, capabilities)
   */
  getCapabilities(): {
    tools: Array<{ name: string; description: string; inputSchema: unknown }>;
    version: string;
  } {
    return {
      version: "1.0.0",
      tools: Array.from(this.tools.values()).map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  }
}
