import nextBlog from "@supergrowthai/next-blog";
import path from "path";
import fs from "fs";
import { FileDBAdapter } from "@supergrowthai/next-blog/adapters";
import { NextRequest, NextResponse } from "next/server";

// Create a data directory for our file-based database
const dataPath = path.join(process.cwd(), "blog-data");

// Ensure the data directory exists
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

// Path for storing config
const configPath = path.join(dataPath, "config.json");

// Initialize the FileDBAdapter
const dbProvider = async () => new FileDBAdapter(`${dataPath}/`);

// Initialize default config if it doesn't exist
if (!fs.existsSync(configPath)) {
  const defaultConfig = {
    blogBasePath: "/blog",
    theme: {
      primaryColor: "#3b82f6",
      secondaryColor: "#10b981",
      darkMode: false,
    },
    features: {
      comments: true,
      search: true,
      analytics: false,
    },
  };
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
}

export async function GET() {
  try {
    // Read the config file
    const configData = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(configData);

    // Add branding from route.ts (hardcoded branding)
    config.branding = {
      name: "Amazing 1oh1",
      description: "The best directory website"
    };

    return NextResponse.json({
      code: 0,
      message: "Config retrieved successfully",
      payload: config,
    });
  } catch (error) {
    console.error("Error retrieving config:", error);
    return NextResponse.json(
      {
        code: 500,
        message: "Failed to retrieve config",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();

    // Read the current config
    const configData = fs.readFileSync(configPath, "utf8");
    const currentConfig = JSON.parse(configData);

    // Merge the new config with the current config
    // Remove branding if it's included in the body to preserve hardcoded values
    const { branding, ...rest } = body;
    const updatedConfig = { ...currentConfig, ...rest };

    // Write the updated config to the file
    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));

    // Add branding from route.ts (hardcoded branding) for the response
    updatedConfig.branding = {
      name: "Amazing 1oh1",
      description: "The best directory website"
    };

    return NextResponse.json({
      code: 0,
      message: "Config updated successfully",
      payload: updatedConfig,
    });
  } catch (error) {
    console.error("Error updating config:", error);
    return NextResponse.json(
      {
        code: 500,
        message: "Failed to update config",
      },
      { status: 500 }
    );
  }
}