import type {
  IAuthHandler,
  AuthResult,
  OneApiRequest,
  OneApiResponse,
} from "@supergrowthai/oneapi";

/**
 * MCPAuthHandler - Stateless API key validation for MCP server
 * 
 * Extracts API key from X-MCP-Key or Authorization: Bearer header
 * Returns system "mcp" user if key is valid, null otherwise
 */
export class MCPAuthHandler
  implements IAuthHandler<{ apiKey: string }, { id: string; role: "mcp" }, { isMCP: boolean; timestamp: number }>
{
  constructor(private expectedApiKey: string) {
    if (!expectedApiKey) {
      throw new Error("MCPAuthHandler requires an API key");
    }
  }

  /**
   * Authenticate credentials (API key)
   */
  async login(
    credentials: { apiKey: string },
    _req: OneApiRequest,
    _res?: OneApiResponse | null
  ): Promise<AuthResult<{ id: string; role: "mcp" }>> {
    // direct comparison seems weak, need to change to a better alternative
    if (credentials.apiKey === this.expectedApiKey) {
      return {
        success: true,
        user: { id: "system-mcp", role: "mcp" },
      } as AuthResult<{ id: string; role: "mcp" }>;
    }
    return {
      success: false,
      error: "Invalid API key",
    } as AuthResult<{ id: string; role: "mcp" }>;
  }

  /**
   * Logout - no-op for stateless auth
   */
  async logout(_req: OneApiRequest, _res?: OneApiResponse | null): Promise<void> {
    // No-op for stateless API key auth
  }

  /**
   * Extract user from request headers
   * Looks for X-MCP-Key or Authorization: Bearer header
   */
  async getUser(
    req: OneApiRequest,
    _res?: OneApiResponse | null
  ): Promise<{ id: string; role: "mcp" } | null> {
    const apiKey = this.extractApiKey(req);

    // same weak comparison
    if (apiKey === this.expectedApiKey) {
      return { id: "system-mcp", role: "mcp" };
    }
    return null;
  }

  /**
   * Check if request is authenticated
   */
  async isAuthenticated(req: OneApiRequest, _res?: OneApiResponse | null): Promise<boolean> {
    return (await this.getUser(req)) !== null;
  }

  /**
   * Update user - no-op for stateless auth
   */
  async updateUser(
    _user: { id: string; role: "mcp" },
    _req: OneApiRequest,
    _res?: OneApiResponse | null
  ): Promise<void> {
    // No-op for stateless API key auth
  }

  /**
   * Get session information
   */
  async getSession(
    _req: OneApiRequest,
    _res?: OneApiResponse | null
  ): Promise<{ isMCP: boolean; timestamp: number }> {
    return {
      isMCP: true,
      timestamp: Date.now(),
    };
  }

  /**
   * Extract API key from request headers
   * Supports: X-MCP-Key or Authorization: Bearer
   */
  private extractApiKey(req: OneApiRequest): string | null {
    if (!req.headers) return null;

    // Handle Next.js style Headers object (has .get method)
    if (typeof req.headers === "object" && "get" in req.headers) {
      const headersObj = req.headers as any;
      const key =
        headersObj.get?.("x-mcp-key") ||
        headersObj.get?.("X-MCP-Key") ||
        headersObj.get?.("authorization") ||
        headersObj.get?.("Authorization");

      if (key && typeof key === "string") {
        // Handle "Bearer <key>" format
        if (key.startsWith("Bearer ")) {
          return key.slice(7);
        }
        return key;
      }
    } else {
      // Handle plain object headers
      const headersObj = req.headers as Record<string, any>;
      const key =
        headersObj["x-mcp-key"] ||
        headersObj["X-MCP-Key"] ||
        headersObj["authorization"] ||
        headersObj["Authorization"];

      if (key && typeof key === "string") {
        // Handle "Bearer <key>" format
        if (key.startsWith("Bearer ")) {
          return key.slice(7);
        }
        return key;
      }
    }

    return null;
  }
}
