import React from "react";
import path from "path";
import fs from "fs";
import Link from "next/link";

// Interface for our config
interface Config {
  blogBasePath: string;
  [key: string]: any;
}

// Function to get config from our API
async function getConfig(): Promise<Config> {
  try {
    // Use server-side file reading in Next.js server components for simplicity
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

// Function to get sample blog posts
async function getSampleBlogs() {
  // This is just a placeholder - in a real app, you would fetch actual blogs
  return [
    {
      _id: "1",
      slug: "getting-started",
      title: "Getting Started with Next-Blog",
      excerpt: "Learn how to set up and use the Next-Blog package in your Next.js application."
    },
    {
      _id: "2",
      slug: "custom-blog-paths",
      title: "Using Custom Blog Paths",
      excerpt: "Configure dynamic blog paths to match your site's URL structure."
    },
    {
      _id: "3",
      slug: "styling-your-blog",
      title: "Styling Your Blog Posts",
      excerpt: "Tips and tricks for making your blog posts look great."
    }
  ];
}

export default async function BlogIndexPage() {
  const config = await getConfig();
  const blogBasePath = config.blogBasePath || "/blog";
  const sampleBlogs = await getSampleBlogs();

  // Is this a custom path (not /blog)?
  const isCustomPath = blogBasePath !== "/blog";

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Blog</h1>

      {isCustomPath && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            <strong>Note:</strong> Current blog path is configured as: <code className="bg-yellow-100 px-2 py-1 rounded">{blogBasePath}</code>
          </p>
          <p className="text-yellow-700 mt-2 text-sm">
            Thanks to our middleware, you can access your blog posts at {blogBasePath}/[slug]
          </p>
          <p className="text-yellow-700 mt-2 text-sm">
            You can change this setting in the <Link href="/api/next-blog/dashboard/settings" className="text-blue-600 underline">dashboard settings</Link>.
          </p>
        </div>
      )}

      <div className="grid gap-6">
        {sampleBlogs.map(blog => (
          <div key={blog._id} className="p-4 border rounded-lg shadow-sm bg-white">
            <h2 className="text-xl font-semibold mb-2">
              <Link
                href={`${blogBasePath}/${blog.slug}`}
                className="text-blue-600 hover:underline"
              >
                {blog.title}
              </Link>
            </h2>
            <p className="text-gray-600">{blog.excerpt}</p>
            <div className="mt-2">
              <Link
                href={`${blogBasePath}/${blog.slug}`}
                className="text-sm text-blue-600 hover:underline"
              >
                Read more →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}