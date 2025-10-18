# @supergrowthai/oneapi

Universal TypeScript API router for Express.js and Next.js - Write once, deploy anywhere. Build type-safe APIs that
seamlessly work across different Node.js frameworks with a single codebase.

## Why OneAPI?

**Write your API endpoints once, use them everywhere.** Whether you're building a standalone Express server, Next.js API
routes, or migrating between frameworks, OneAPI ensures your business logic remains portable and framework-independent.

### Key Benefits

- **🚀 Framework Portability**: Declare endpoints once and use them in standalone Express servers, Next.js API routes, or
  any Web-standard Request/Response environment
- **🔄 Zero Migration Cost**: Switch between Express and Next.js without rewriting your API logic
- **📦 Minimal Bundle Size**: Tree-shakeable exports - only include what you use
- **🛡️ Type-Safe by Default**: Full TypeScript support with inference for request/response types
- **🔐 Built-in Authentication**: Iron Session support out of the box for secure session management
- **⚡ Performance First**: Route caching and optimized path matching for fast request handling
- **🎯 Standard Web APIs**: Built on Web-standard Request/Response for maximum compatibility

## Installation

```bash
npm install @supergrowthai/oneapi
# or
bun add @supergrowthai/oneapi
# or
pnpm add @supergrowthai/oneapi
# or
yarn add @supergrowthai/oneapi
```

## Features

- **Framework Agnostic Core**: Generic router implementation that works with standard Web APIs
- **Multi-Framework Support**: Built-in adapters for Express.js (v5+) and Next.js (v15+)
- **Type Safety**: Full TypeScript support with comprehensive type definitions and inference
- **Session Management**: Built-in Iron Session authentication handler with type-safe session data
- **Dynamic Routing**: Support for dynamic path segments (`[id]`) and catch-all routes (`[...]`)
- **Error Handling**: Standardized error classes with proper HTTP status codes
- **Request Parsing**: Automatic body parsing for JSON, FormData, and URL-encoded data
- **Route Caching**: Optimized path matching with built-in cache for improved performance

## Quick Start

### 1. Define Your API Once

```typescript
// api/endpoints.ts
import {PathObject, Success, BadRequest, NotFound} from '@supergrowthai/oneapi';

export const apiEndpoints: PathObject = {
    api: {
        users: {
            // GET /api/users
            '*': async (session, request) => {
                const users = await db.users.findAll();
                return new Success('Users retrieved', users);
            },

            // GET /api/users/[id]
            '[id]': async (session, request) => {
                const {id} = request._params!;
                const user = await db.users.findById(id);

                if (!user) {
                    throw new NotFound(`User ${id} not found`);
                }

                return {code: 200, message: 'User found', payload: user};
            },

            // POST /api/users/create
            create: async (session, request) => {
                const {name, email} = request.body;

                if (!name || !email) {
                    throw new BadRequest('Name and email required');
                }

                const user = await db.users.create({name, email});
                return new Success('User created', user);
            }
        },

        // Catch-all route for /api/files/*
        files: {
            '[...]': async (session, request) => {
                const path = request._params!.catchAll;
                return {code: 200, message: `Accessing file: ${path}`};
            }
        }
    }
};
```

### 2A. Use in Express.js Server

```typescript
// server.ts
import express from 'express';
import {createExpressRouter, ExpressIronSessionHandler} from '@supergrowthai/oneapi/express';
import {apiEndpoints} from './api/endpoints';

const app = express();

// Create router with optional authentication
const router = createExpressRouter(apiEndpoints, {
    pathPrefix: '/api',
    authHandler: new ExpressIronSessionHandler({
        password: process.env.SESSION_SECRET!,
        cookieName: 'app-session'
    })
});

// Mount the router
app.use(router.middleware());

app.listen(3000, () => {
    console.log('Express server running on port 3000');
});
```

### 2B. Use in Next.js API Route

```typescript
// app/api/[[...path]]/route.ts (App Router)
import {createNextJSRouter, NextJsIronSessionHandler} from '@supergrowthai/oneapi/nextjs';
import {apiEndpoints} from '@/api/endpoints';

const router = createNextJSRouter(apiEndpoints, {
    authHandler: new NextJsIronSessionHandler({
        password: process.env.SESSION_SECRET!,
        cookieName: 'app-session'
    })
});

export const GET = router.handle;
export const POST = router.handle;
export const PUT = router.handle;
export const DELETE = router.handle;
```

## Real-World Example: Building a Multi-Platform API

Here's how OneAPI enables you to build once and deploy anywhere:

```typescript
// shared-api.ts - Your business logic lives here
import {PathObject, UnAuthorised} from '@supergrowthai/oneapi';

export const blogAPI: PathObject = {
    posts: {
        // Public endpoint
        '*': async (session, request) => {
            const posts = await fetchPosts();
            return {code: 200, message: 'Posts retrieved', payload: posts};
        },

        // Protected endpoint with session check
        create: async (session, request) => {
            if (!session.user) {
                throw new UnAuthorised('Login required');
            }

            const post = await createPost(request.body);
            return {code: 201, message: 'Post created', payload: post};
        },

        '[id]': {
            // Dynamic route with nested methods
            '*': async (session, request) => {
                const {id} = request._params!;
                const post = await fetchPost(id);
                return {code: 200, message: 'Post retrieved', payload: post};
            },

            edit: async (session, request) => {
                if (!session.user) {
                    throw new UnAuthorised();
                }

                const {id} = request._params!;
                const updated = await updatePost(id, request.body);
                return {code: 200, message: 'Post updated', payload: updated};
            }
        }
    }
};

// Now use the SAME API in different environments:
// 1. Standalone Express microservice
// 2. Next.js serverless function
// 3. Bun server
// 4. Any Web-standard Request/Response environment
```

## TypeScript Support

OneAPI is built with TypeScript-first design, providing complete type inference:

```typescript
import {OneApiFunction, MinimumRequest} from '@supergrowthai/oneapi';

// Define strongly-typed requests and responses
type CreateUserRequest = MinimumRequest<
    { 'content-type': string },  // Headers
    { name: string; email: string },  // Body
    { role?: string }  // Query params
>;

type UserResponse = {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
};

// Type-safe handler function
const createUser: OneApiFunction<
    any,  // Extra context
    { 'content-type': string },
    { name: string; email: string },
    { role?: string },
    UserResponse  // Response payload type
> = async (session, request) => {
    // TypeScript knows request.body has name and email
    const {name, email} = request.body;
    const {role} = request.query;

    const user = await db.users.create({name, email, role});

    return {
        code: 201,
        message: 'User created',
        payload: user  // Type-checked against UserResponse
    };
};
```

## Migration Guide

### From Express to Next.js

```typescript
// Before: Express-only implementation
app.post('/api/users', authMiddleware, async (req, res) => {
    const user = await createUser(req.body);
    res.json({success: true, user});
});

// After: Universal implementation
const apiEndpoints: PathObject = {
    users: {
        create: async (session, request) => {
            if (!session.user) throw new UnAuthorised();
            const user = await createUser(request.body);
            return new Success('User created', user);
        }
    }
};

// Use in Express
const router = createExpressRouter(apiEndpoints);
app.use('/api', router.middleware());

// AND use in Next.js
export default createNextJSRouter(apiEndpoints).handle;
```

## API Reference

### Core Types

#### `OneApiFunction`

Handler function for API endpoints that receives session data, request, and extra parameters.

```typescript
type OneApiFunction<EXTRA, HEADERS, BODY, QUERY, RPayload, SESSION_DATA> = {
    (session: SESSION_DATA, request: MinimumRequest<HEADERS, BODY, QUERY>, extra: EXTRA):
        Promise<OneApiFunctionResponse<RPayload> | CommonResponse>;
    config?: OneApiFunctionConfig;
}
```

#### `MinimumRequest`

Normalized request object with parsed query, body, headers, and cookies.

```typescript
interface MinimumRequest {
    query: Record<string, string>;
    body: any;
    method: 'POST' | 'GET' | 'DELETE' | 'OPTIONS' | 'PUT' | 'PATCH' | 'HEAD';
    headers: Record<string, string>;
    cookies: Record<string, string>;
    url: string;
    _params?: Record<string, string>;
}
```

#### `SessionData`

Session context passed to handler functions.

```typescript
interface SessionData<USER, SESSION> {
    user?: USER;
    domain?: string | null;
    api?: APIImpl;
    authHandler?: IAuthHandler;
    session?: SESSION;
}
```

### Error Classes

- `Success` - HTTP 200 with optional payload
- `BadRequest` - HTTP 400
- `UnAuthorised` - HTTP 401
- `Forbidden` - HTTP 403
- `NotFound` - HTTP 404
- `InternalServerError` - HTTP 500
- `Exception` - Custom status code

### Path Patterns

- Static paths: `users`, `products`
- Dynamic segments: `[id]`, `[slug]`
- Catch-all routes: `[...]`
- Index routes: `*`

## Build Configuration

The package uses Vite for building with three entry points:

- `index.js` - Core functionality
- `express.js` - Express.js adapter
- `nextjs.js` - Next.js adapter

## Development

```bash
# Install dependencies
bun install

# Development mode with watch
bun run dev

# Type checking
bun run typecheck

# Build for production
bun run build

# Clean build artifacts
bun run clean
```

## Dependencies

- `iron-session`: Session management
- Peer dependencies:
    - `express` >= 5.0.0 (optional)
    - `next` >= 15.0.0 (optional)

## Performance

OneAPI includes several performance optimizations:

- **Route Caching**: Routes are cached after first match for O(1) lookup on subsequent requests
- **Minimal Overhead**: Thin abstraction layer adds negligible overhead to raw framework performance
- **Tree-Shakeable**: Modular exports ensure you only bundle what you use
- **No Dependencies**: Core has zero runtime dependencies except `iron-session` for auth

## When to Use OneAPI

OneAPI is perfect for:

- **Microservices**: Share API logic between different service implementations
- **Monorepos**: Maintain consistent API interfaces across multiple applications
- **Framework Migration**: Gradually migrate from Express to Next.js (or vice versa)
- **Multi-deployment**: Deploy same API to serverless, containers, or edge environments
- **Type-Safe APIs**: Build fully type-safe APIs with TypeScript inference
- **Rapid Prototyping**: Quickly build APIs without framework lock-in

## Comparison with Alternatives

| Feature            | OneAPI | Express Router | Next.js API Routes |
|--------------------|--------|----------------|--------------------|
| Framework Agnostic | ✅      | ❌              | ❌                  |
| TypeScript First   | ✅      | ⚠️             | ✅                  |
| Built-in Auth      | ✅      | ❌              | ❌                  |
| Route Caching      | ✅      | ❌              | ❌                  |
| Express Support    | ✅      | ✅              | ❌                  |
| Next.js Support    | ✅      | ❌              | ✅                  |
| Bundle Size        | Small  | Large          | N/A                |
| Web Standards      | ✅      | ❌              | ✅                  |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

See LICENSE file in the repository root.

---

**Keywords**: typescript api router, express nextjs router, universal api framework, nodejs api router, framework
agnostic router, typescript rest api, express middleware, nextjs api routes, web standard api, portable api framework,
multi-framework api, api route handler, typescript http router, iron session, authentication middleware