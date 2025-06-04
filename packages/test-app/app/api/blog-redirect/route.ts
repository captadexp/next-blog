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

// Route handler to check if a path should be handled as a blog post
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    
    // Get the configured blog base path
    const config = await getConfig();
    const configuredBlogPath = config.blogBasePath || "/blog";
    
    // Parse configured path
    const configPathSegments = configuredBlogPath
      .substring(1) // Remove leading /
      .split("/")
      .filter(Boolean);
    
    // Parse the requested path
    const pathSegments = path.split('/').filter(Boolean);
    
    // Check if the path starts with the configured blog path
    let matchesConfigPath = true;
    
    // If we don't have enough segments to match, not a blog path
    if (pathSegments.length < configPathSegments.length) {
      return NextResponse.json({ 
        isBlogPath: false 
      });
    }
    
    // Check if all segments match
    for (let i = 0; i < configPathSegments.length; i++) {
      if (pathSegments[i] !== configPathSegments[i]) {
        matchesConfigPath = false;
        break;
      }
    }
    
    if (!matchesConfigPath) {
      return NextResponse.json({ 
        isBlogPath: false 
      });
    }
    
    // If it matches the exact path (e.g., /blog or /articles/news), it's a blog index
    if (pathSegments.length === configPathSegments.length) {
      console.log(`[blog-redirect] Path ${path} matches configured blog path ${configuredBlogPath} exactly - treating as index`);
      return NextResponse.json({
        isBlogPath: true,
        type: 'index',
        blogBasePath: configuredBlogPath
      });
    }

    // If it has more segments, the last one is the slug
    // (e.g., /blog/my-post or /articles/news/latest-update)
    const slug = pathSegments[pathSegments.length - 1];

    console.log(`[blog-redirect] Path ${path} matches blog pattern - extracting slug '${slug}' from configured path ${configuredBlogPath}`);

    return NextResponse.json({
      isBlogPath: true,
      type: 'post',
      slug,
      blogBasePath: configuredBlogPath
    });
  } catch (error) {
    console.error('Error in blog-redirect API:', error);
    return NextResponse.json({ 
      error: 'Failed to process request'
    }, { status: 500 });
  }
}