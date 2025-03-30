# Next-Blog

****

### Currently supports nextjs apps router only

**Elevate your Next.js project with seamless blogging functionality.**

Next-Blog is designed to integrate a blogging platform into your Next.js application effortlessly, akin to the
simplicity of integrating NextAuth today.

**Currently, Next-Blog is a work in progress and I'm excited to invite collaborators to join me in this journey.**
Whether you're interested in coding, documentation, design, or testing, I welcome contributions of all kinds to make
Next-Blog robust and user-friendly.

![Folder Structure](https://github.com/captadexp/next-blog/blob/main/images/apps-router-folder-structure.png?raw=true)

## Project Structure

This project has been migrated to use Vite for building and Bun as the package manager. It's now organized as a monorepo with workspaces:

```
next-blog/
├── packages/
│   ├── core/           # Main package (@supergrowthai/next-blog)
│   └── test-app/       # Test Next.js application
├── package.json        # Workspace root package.json
└── bunfig.toml         # Bun configuration
```

### Development

```bash
# Install dependencies
bun install

# Build the core package
npm run build

# Watch core package for changes
npm run dev

# Run the test application
npm run dev:test
```

### Test Application

A test Next.js application is included in the `packages/test-app` directory. This app demonstrates how to integrate Next-Blog into a Next.js project and can be used for development and testing.

To run the test app:

```bash
npm run dev:test
```

Then visit http://localhost:3000 and click "Go to Blog Dashboard" to access the blog management interface.

### Quick Start

To add Next-Blog to your project, follow these simple steps:

1. **Install Next-Blog**

   First, ensure you have Next.js set up.
   Then, install Next-Blog by adding it to your project dependencies.
   ```shell
   npm i @supergrowthai/next-blog
   ```

2. Create a new route at `app/api/next-blog/[...page]/route.ts`

### Available Modules

Next-Blog provides the following modules:

```typescript
// Core functionality
import nextBlog, { FileDBAdapter, MongoDBAdapter } from '@supergrowthai/next-blog';

// Alternative adapter import paths
import { FileDBAdapter, MongoDBAdapter } from '@supergrowthai/next-blog/adapters';

// Types (if needed)
import type { Configuration } from '@supergrowthai/next-blog/types';
```

The UI module is reserved for future customizable components.

3. **Update Your Route Configuration**

   In your `route.ts`, integrate Next-Blog as shown:

   ```typescript
   import nextBlog, { FileDBAdapter } from "@supergrowthai/next-blog"
   import path from 'path';
   import fs from 'fs';

   // Create path for file db
   const dataPath = path.join(process.cwd(), "blog-data");
   
   // Ensure directory exists
   if (!fs.existsSync(dataPath)) {
     fs.mkdirSync(dataPath, { recursive: true });
   }
   
   // Initialize the database provider
   const dbProvider = async () => new FileDBAdapter(dataPath)
   
   // Initialize Next-Blog
   const {GET, POST} = nextBlog({db: dbProvider})

   export { GET, POST };
   ```

   For MongoDB support:
   
   ```typescript
   import nextBlog, { MongoDBAdapter } from "@supergrowthai/next-blog"
   
   // Initialize the MongoDB database provider
   const dbProvider = async () => new MongoDBAdapter({
     url: process.env.MONGODB_URI,
     dbName: "your-blog-db"
   })
   
   // Initialize Next-Blog
   const {GET, POST} = nextBlog({db: dbProvider})

   export { GET, POST };
   ```

### Roadmap

Here are the next steps on our journey to enhance Next-Blog:

- [x] Project initialization.
- [x] Added a simple database adapter (JSONFile + MongoDB).
- [x] Implement internal dashboard pages for managing posts, complete with an editor.
- [x] Migrate to Vite build system with Bun
- [x] Create test application for development and testing
- [ ] Create hooks for accessing the blog content by slug
- [ ] Introduce configuration options for managing pages, tags, and filters.
- [ ] Create a sample theme to kickstart your blog aesthetics.
- [ ] And more - we're open to suggestions!

### Get Involved

I'm looking for contributors to help develop features, write documentation, design user interfaces, and more. If
you're passionate about making content creation accessible and straightforward for Next.js developers, I'd love to hear
from you.

**Join me in shaping the future of blogging in Next.js. Together, we can build something amazing.**