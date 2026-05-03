// MCP Blog Writer Type Definitions

/**
 * Details for blog generation/editing
 */
export interface MCPBlogDetails {
  title: string;
  intent: string;
  tone: "formal" | "casual" | "technical" | "conversational";
  writingStyle: string;
}

/**
 * MCP Tool definition - what Claude can call
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
  handler: (params: unknown, context: MCPContext) => Promise<unknown>;
}

/**
 * Execution context for tools (includes auth info)
 */
export interface MCPContext {
  user: {
    id: string;
    role: "mcp";
  };
  session: {
    isMCP: boolean;
    timestamp: number;
  };
}

/**
 * MCP Server configuration
 */
export interface MCPServerConfig {
  apiKey: string;
  debug?: boolean;
}

/**
 * Tool registry for managing available tools
 */
export interface ToolRegistry {
  tools: Map<string, MCPTool>;
  get(toolName: string): MCPTool | undefined;
  getAll(): MCPTool[];
  register(tool: MCPTool): void;
}

/**
 * MCP Request structure
 */
export interface MCPRequest {
  tool: string;
  params: unknown;
}

/**
 * MCP Response structure
 */
export interface MCPResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
