import Link from 'next/link'
import path from 'path'
import fs from 'fs'

// Simple function to get the current configured blog base path
async function getCurrentBlogPath() {
  try {
    const dataPath = path.join(process.cwd(), "blog-data");
    const configPath = path.join(dataPath, "config.json");
    
    if (!fs.existsSync(configPath)) {
      return '/blog'; // Default
    }
    
    const configData = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(configData);
    return config.blogBasePath || '/blog';
  } catch (error) {
    console.error("Error loading config:", error);
    return '/blog'; // Default on error
  }
}

// Helper function to demonstrate a sample blog URL
function getSampleBlogUrl(basePath: string, sampleSlug: string = 'sample-post'): string {
  // For custom paths that aren't just /blog, we have a more complex structure
  if (basePath !== '/blog') {
    // Replace '/blog' with nothing in multi-part paths like '/blog/abc/xyz'
    if (basePath.startsWith('/blog/')) {
      return `${basePath}/${sampleSlug}`;
    }
  }
  
  // For the default path or simple overrides
  return `${basePath}/${sampleSlug}`;
}

export default async function Home() {
    const currentBlogPath = await getCurrentBlogPath();
    const sampleUrl = getSampleBlogUrl(currentBlogPath);
    
    return (
        <main className="flex max-h-screen flex-col items-center justify-between p-24">
            <h1 className="text-4xl font-bold mb-8">Next-Blog Test App</h1>
            <div className="mb-8 text-lg text-center max-w-2xl">
                <p className="mb-4">
                    This is a test app for integrating the Next-Blog package.
                    Navigate to the dashboard to manage your blog content.
                </p>
                <p className="mb-4">
                    <strong>Current Blog Path:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{currentBlogPath}</code>
                </p>
                <p className="mb-2">
                    <strong>Sample Blog URL:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{sampleUrl}</code>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                    You can customize this path in the dashboard settings.
                    The app supports dynamic nested paths like <code className="bg-gray-100 px-1">/blog/abc/xyz</code>.
                </p>
                <div className="mt-2 text-sm p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="font-medium text-blue-700 mb-1">How Routing Works:</p>
                    <ul className="list-disc pl-5 text-blue-600">
                        <li>Default blog URLs: <code>/blog/[slug]</code></li>
                        <li>Custom blog URLs: <code>/blog/abc/xyz/[slug]</code> (defined in settings)</li>
                        <li>All URLs are dynamically routed to the same blog post component</li>
                    </ul>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                    href="/api/next-blog/dashboard"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 text-center"
                >
                    Go to Blog Dashboard
                </Link>
                <Link
                    href="/api/next-blog/dashboard/settings"
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700 text-center"
                >
                    Configure Blog Path
                </Link>
                <Link
                    href="/blog"
                    className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-700 text-center"
                >
                    View Blog
                </Link>
            </div>
        </main>
    )
}