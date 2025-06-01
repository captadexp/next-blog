import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Function to get config
async function getConfig(): Promise<{ blogBasePath: string }> {
  try {
    const dataPath = path.join(process.cwd(), "blog-data");
    const configPath = path.join(dataPath, "config.json");
    
    if (!fs.existsSync(configPath)) {
      return { blogBasePath: "/blog" }; // Default
    }
    
    const configData = fs.readFileSync(configPath, "utf8");
    return JSON.parse(configData);
  } catch (error) {
    console.error("Error loading config:", error);
    return { blogBasePath: "/blog" }; // Default on error
  }
}

// Route handler to get blog configuration
export async function GET(request: NextRequest) {
  try {
    const config = await getConfig();
    
    return NextResponse.json({ 
      blogBasePath: config.blogBasePath || "/blog",
      success: true
    });
  } catch (error) {
    console.error('Error in blog-config API:', error);
    return NextResponse.json({ 
      error: 'Failed to process request',
      blogBasePath: "/blog" // Default on error
    }, { status: 500 });
  }
}