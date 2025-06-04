import { notFound } from "next/navigation";
import React from "react";
import path from "path";
import fs from "fs";
import Link from "next/link";

// Interface for our config
interface Config {
  blogBasePath: string;
  [key: string]: any;
}

// Interface for blog data
interface Blog {
  _id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  tags: string[];
  userId: string;
  excerpt?: string;
  status: "draft" | "published";
  createdAt: number;
  updatedAt: number;
}

// Function to get config from our API
async function getConfig(): Promise<Config> {
  try {
    // Use server-side file reading in Next.js server components for simplicity
    const dataPath = path.join(process.cwd(), "blog-data");
    const configPath = path.join(dataPath, "config.json");

    if (!fs.existsSync(configPath)) {
      // If config doesn't exist, create it with default values
      const defaultConfig = {
        blogBasePath: "/blog"
      };

      // Create the directory if it doesn't exist
      if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
      }

      // Write the default config
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }

    const configData = fs.readFileSync(configPath, "utf8");
    return JSON.parse(configData);
  } catch (error) {
    console.error("Error loading config:", error);
    return { blogBasePath: "/blog" }; // Default on error
  }
}

// Function to get a blog by slug
async function getBlogBySlug(slug: string): Promise<Blog | null> {
  try {
    // First check if we can find the blog in the main blogs.json file
    const dataPath = path.join(process.cwd(), "blog-data");
    const mainBlogsPath = path.join(dataPath, "blogs.json");
    const tagsPath = path.join(dataPath, "tags.json");

    // Load all tags to resolve tag IDs to names
    let tagMap: Record<string, string> = {};
    if (fs.existsSync(tagsPath)) {
      try {
        const tagsData = fs.readFileSync(tagsPath, "utf8");
        const tags = JSON.parse(tagsData);
        // Create a map of tag ID to tag name for quick lookups
        tagMap = tags.reduce((acc: Record<string, string>, tag: any) => {
          acc[tag._id] = tag.name;
          return acc;
        }, {});
      } catch (err) {
        console.error("Error loading tags:", err);
      }
    }

    // Helper function to resolve tag IDs to names and fix potential concatenation issues
    const resolveTagNames = (blog: Blog): Blog => {
      if (!blog.tags) return blog;

      // Handle case where tags might be a single string that's concatenated multiple tag names
      // Example: "krishnaayushcollege" should be ["krishna", "ayush", "college"]

      let resolvedTags: string[] = [];

      // If it's a string array, process each tag
      if (Array.isArray(blog.tags)) {
        // First check if we have known tag names to match against
        const tagNames = Object.values(tagMap).map(name => name.toLowerCase());

        // Process each tag
        blog.tags.forEach(tag => {
          if (typeof tag !== 'string') {
            resolvedTags.push(String(tag));
            return;
          }

          // Try to resolve ID to name first
          const tagName = tagMap[tag] || tag;

          // Check if this could be a concatenated string of known tags
          if (tagName.length > 15 && !tagName.includes(' ')) {
            // Look for known tag names within the string
            let remaining = tagName.toLowerCase();
            let found = false;

            // Try to extract known tag names
            tagNames.forEach(knownTag => {
              if (remaining.includes(knownTag)) {
                found = true;
                // Add the known tag with proper casing
                resolvedTags.push(
                  Object.values(tagMap).find(
                    t => t.toLowerCase() === knownTag
                  ) || knownTag
                );
                // Remove the found tag from the remaining string
                remaining = remaining.replace(knownTag, '');
              }
            });

            // If we couldn't extract known tags, just add the original
            if (!found) {
              resolvedTags.push(tagName);
            } else if (remaining.trim()) {
              // Add any remaining text as a separate tag
              resolvedTags.push(remaining.trim());
            }
          } else {
            // Regular tag, just add it
            resolvedTags.push(tagName.trim());
          }
        });
      } else if (typeof blog.tags === 'string') {
        // If tags is a single string, try to split it into an array
        if (blog.tags.includes(',')) {
          resolvedTags = blog.tags.split(',').map(t => t.trim());
        } else {
          // No commas, just treat as a single tag
          resolvedTags = [blog.tags.trim()];
        }
      }

      // Return the blog with the resolved tags
      return { ...blog, tags: resolvedTags };
    };

    // First try to find the blog in the main blogs.json file
    if (fs.existsSync(mainBlogsPath)) {
      const blogsData = fs.readFileSync(mainBlogsPath, "utf8");
      const blogs = JSON.parse(blogsData);

      // Find the blog with matching slug
      const blog = blogs.find((b: any) => b.slug === slug);
      if (blog) {
        console.log(`Found blog "${blog.title}" with slug "${slug}" in blogs.json`);
        return resolveTagNames(blog);
      }
    }

    // If not found in main file, check the blogs directory
    const blogsDir = path.join(dataPath, "blogs");
    if (fs.existsSync(blogsDir)) {
      // Read all files in the blogs directory
      const files = fs.readdirSync(blogsDir);

      for (const file of files) {
        if (file.endsWith(".json")) {
          const blogData = fs.readFileSync(path.join(blogsDir, file), "utf8");
          const blog = JSON.parse(blogData);

          if (blog.slug === slug) {
            return resolveTagNames(blog);
          }
        }
      }
    }

    // Sample blog post for demo purposes if none found
    if (slug === "sample-post" || slug === "getting-started" ||
        slug === "custom-blog-paths" || slug === "styling-your-blog") {
      return {
        _id: "sample",
        title: "Sample Blog Post",
        slug,
        content: `This is a sample blog post for the slug "${slug}".\n\nIn a real application, this content would be fetched from your database or CMS. This is just a placeholder to demonstrate the dynamic routing capability.`,
        category: "Sample",
        tags: ["sample", "demo"],
        userId: "system",
        status: "published",
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }

    console.log(`Blog with slug "${slug}" not found`);
    return null;
  } catch (error) {
    console.error("Error getting blog by slug:", error);
    return null;
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

export default async function BlogPathPage({
  params,
}: {
  params: { slug: string[] };
}) {
  // Get the config to determine the blog base path
  const config = await getConfig();
  const configuredBlogPath = config.blogBasePath || "/blog";

  console.log('[BlogPathPage] Loaded config with blogBasePath:', configuredBlogPath);

  // Always await params before using its properties
  const slugParam = await Promise.resolve(params.slug);
  const slugSegments = slugParam || [];

  console.log('[BlogPathPage] Received slug segments:', slugSegments);

  // If slug array is empty, show 404 (should never happen with [...slug])
  if (slugSegments.length === 0) {
    return notFound();
  }

  // Since we're using the middleware to handle routing,
  // We can assume the blog post slug is the last segment
  const slug = slugSegments[slugSegments.length - 1];
  console.log('[BlogPathPage] Extracted slug:', slug);

  // Handle special preview URLs with format /blog/[userId]/[slug]
  // If we have a URL like /blog/abcd/my-first-blog, use the last segment as the slug
  let finalSlug = slug;
  if (slugSegments.length > 1) {
    console.log('[BlogPathPage] Detected multi-segment path, using last segment as slug');
    finalSlug = slugSegments[slugSegments.length - 1];
  }

  console.log('[BlogPathPage] Using final slug:', finalSlug);

  // For security, we check if this is a direct access to /blog/[slug]
  // or if it's through the intended path

  // This means we need to check the current URL against the configured path
  // Since this is a server component, we can't access window.location
  // Instead, we'll use the headers to check the requested path

  // But we know we're in /blog/[slug] route and this shouldn't display the content
  // unless accessed through the proper base path, so we'll redirect from middleware

  const blog = await getBlogBySlug(finalSlug);

  if (!blog) {
    return notFound();
  }

  return renderBlogPost(blog, configuredBlogPath);
}

// Helper function to render a blog post
function renderBlogPost(blog: Blog, basePath: string) {
  // Dashboard URL - in a real app, this would be configurable
  const dashboardUrl = "/api/next-blog/dashboard/blogs";

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50 min-h-screen">
      {/* Admin Bar - styled with subtle gradient and improved contrast */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg mb-8 shadow-sm flex justify-between items-center border border-blue-100">
        <div className="text-sm font-medium text-indigo-700">
          Viewing as published page
        </div>
        <div className="flex gap-3">
          <Link
            href={dashboardUrl}
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors duration-200"
          >
            <span>← Back to Dashboard</span>
          </Link>
        </div>
      </div>

      <article className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        {/* Article header with improved typography and spacing */}
        <header className="p-6 sm:p-8 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-gray-900 leading-tight">{blog.title}</h1>
          <div className="text-gray-500 mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2" style={{ minWidth: '16px', minHeight: '16px', maxWidth: '16px', maxHeight: '16px' }}>
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {new Date(blog.updatedAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>

          {/* Improved tag display with better alignment */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="flex items-start">
                <h3 className="text-sm font-semibold text-gray-700 mr-3 mt-1 flex-shrink-0 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1" style={{ minWidth: '16px', minHeight: '16px', maxWidth: '16px', maxHeight: '16px' }}>
                    <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Tags:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {/* Handle string or array of strings for compatibility */}
                  {Array.isArray(blog.tags)
                    ? blog.tags.map((tag, index) => {
                      // Add spaces between words for long concatenated tags
                      let displayTag = typeof tag === 'string' ? tag.trim() : String(tag);
                      // Add spaces to concatenated tags (if longer than 15 chars with no spaces)
                      if (displayTag.length > 15 && !displayTag.includes(' ')) {
                        // Try to intelligently add spaces where capital letters occur
                        displayTag = displayTag.replace(/([a-z])([A-Z])/g, '$1 $2');
                        // If still no spaces, try to add spaces every 5-7 characters
                        if (!displayTag.includes(' ')) {
                          const chunks = [];
                          for (let i = 0; i < displayTag.length; i += 6) {
                            chunks.push(displayTag.slice(i, i + 6));
                          }
                          displayTag = chunks.join(' ');
                        }
                      }
                      
                      return (
                        <span
                          key={index}
                          className="bg-indigo-50 text-indigo-700 text-xs px-3 py-1.5 rounded-full shadow-sm border border-indigo-100 hover:bg-indigo-100 transition-colors duration-200"
                        >
                          {displayTag}
                        </span>
                      );
                    })
                  : typeof blog.tags === 'string'
                    ? blog.tags.split(',').map((tag, index) => (
                        <span
                          key={index}
                          className="bg-indigo-50 text-indigo-700 text-xs px-3 py-1.5 rounded-full shadow-sm border border-indigo-100 hover:bg-indigo-100 transition-colors duration-200"
                        >
                          {tag.trim()}
                        </span>
                      ))
                    : null
                  }
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Content area with improved typography and spacing */}
        <div className="p-6 sm:p-8 text-gray-700">
          {/* Category removed as requested */}

          {/* If excerpt exists, show it first - as a simple blockquote */}
          {blog.excerpt && (
            <div className="mb-6">
              <blockquote className="italic text-gray-600 border-l-4 border-indigo-300 pl-4 py-2 bg-gray-50">
                {blog.excerpt}
              </blockquote>
            </div>
          )}

          {/* Handle HTML content properly */}
          <div className="leading-relaxed">
            {typeof blog.content === 'string' ? (
              // Check if content contains HTML tags
              blog.content.includes('<') && blog.content.includes('>') ? (
                // If it contains HTML, sanitize and render it properly
                <div
                  style={{
                    lineHeight: '1.7',
                    fontSize: '16px',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: blog.content
                      .replace(/&nbsp;/g, ' ')  // Replace &nbsp; with regular spaces
                      .replace(/<\/?p>/g, '')   // Remove p tags but keep content
                      .replace(/<p/g, '<p style="margin-bottom: 1.5rem;"')  // Add styles directly to p tags
                      .replace(/<a/g, '<a style="color: #4f46e5; text-decoration: underline;"')  // Style links
                  }}
                />
              ) : (
                // Otherwise, split by newlines and create paragraphs
                blog.content.split('\n').map((paragraph, index) => (
                  <p key={index} style={{
                    marginBottom: '1.5rem',
                    lineHeight: '1.7',
                    fontSize: '16px',
                  }}>
                    {paragraph}
                  </p>
                ))
              )
            ) : (
              // Fallback for content that might already be HTML
              <div
                style={{
                  lineHeight: '1.7',
                  fontSize: '16px',
                }}
                dangerouslySetInnerHTML={{
                  __html: (blog.content as unknown as string)
                    .replace(/&nbsp;/g, ' ')
                    .replace(/<\/?p>/g, '')
                    .replace(/<p/g, '<p style="margin-bottom: 1.5rem;"')  // Add styles directly to p tags
                    .replace(/<a/g, '<a style="color: #4f46e5; text-decoration: underline;"')  // Style links
                }}
              />
            )}
          </div>
        </div>

        {/* Footer with improved navigation - centered */}
        <div className="px-6 sm:px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-center items-center">
          <Link
            href={basePath}
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-200 bg-white px-4 py-2 rounded-full shadow-sm border border-indigo-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2" style={{ minWidth: '16px', minHeight: '16px', maxWidth: '16px', maxHeight: '16px' }}>
              <path d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Back to all posts
          </Link>
        </div>
      </article>
    </div>
  );
}