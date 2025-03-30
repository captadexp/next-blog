# Next-Blog Test App

This is a simple Next.js application that demonstrates how to integrate and use the Next-Blog package.

## Features

- Example integration of Next-Blog in a Next.js App Router project
- File-based database for development and testing
- Blog dashboard accessible at `/api/next-blog/dashboard`

## Getting Started

First, run the development server:

```bash
# From the workspace root
npm run dev:test
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Structure

- `/app/api/next-blog/[...page]/route.ts` - The route handler for Next-Blog
- `/blog-data` - Directory for the file-based database (created automatically)

## Testing Flow

1. Start the app with `npm run dev:test`
2. Visit the homepage at http://localhost:3000
3. Click "Go to Blog Dashboard" to access the blog management interface
4. Create authors, categories, tags, and blog posts
5. All data is stored in the local file-based database