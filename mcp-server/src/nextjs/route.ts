/**
 * Next.js API Route Handler for MCP Blog Writer Server
 * 
 * Usage: Copy this to your Next.js app at app/api/mcp/route.ts
 * 
 * Environment variables needed:
 * - MCP_API_KEY: Secret API key for MCP server
 */

import { NextRequest, NextResponse } from "next/server";
import { MCPBlogServer } from "@supergrowthai/mcp-blog-writer";
import { blogTools } from "@supergrowthai/mcp-blog-writer/tools";
import type { MCPRequest } from "@supergrowthai/mcp-blog-writer";

// Initialize server (ideally cached at module level for production)
let mcpServer: MCPBlogServer | null = null;

function getServer(): MCPBlogServer {
  if (!mcpServer) {
    const apiKey = process.env.MCP_API_KEY;
    if (!apiKey) {
      throw new Error("MCP_API_KEY environment variable is not set");
    }

    mcpServer = new MCPBlogServer({ apiKey });
    blogTools.forEach((tool) => mcpServer!.registerTool(tool));
  }
  return mcpServer;
}

/**
 * GET /api/mcp
 * Returns MCP server capabilities (list of available tools)
 */
export async function GET(request: NextRequest) {
  try {
    const server = getServer();
    const capabilities = server.getCapabilities();

    return NextResponse.json(
      {
        success: true,
        data: capabilities,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mcp
 * Execute an MCP tool
 * 
 * Request body:
 * {
 *   "tool": "generate_blog_post",
 *   "params": {
 *     "topic": "AI",
 *     "style": "technical"
 *   }
 * }
 * 
 * Headers:
 * - X-MCP-Key: <api-key> OR Authorization: Bearer <api-key>
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const mcpRequest: MCPRequest = body;

    // Validate request structure
    if (!mcpRequest.tool || !mcpRequest.params) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid request format. Expected: { tool: string, params: object }",
        },
        { status: 400 }
      );
    }

    // Convert Next.js headers to OneApiRequest format
    const oneApiRequest = {
      headers: {
        get: (name: string) => request.headers.get(name),
      } as any,
    };

    // Execute on MCP server
    const server = getServer();
    const response = await server.handleRequest(oneApiRequest, mcpRequest);

    // Return response
    const statusCode = response.success ? 200 : 400;
    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[MCP API] Error:", message);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/mcp
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-MCP-Key",
    },
  });
}
