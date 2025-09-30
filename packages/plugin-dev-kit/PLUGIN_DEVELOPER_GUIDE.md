# Plugin Developer Guide

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Plugin Structure](#plugin-structure)
- [Client SDK Reference](#client-sdk-reference)
- [Server SDK Reference](#server-sdk-reference)
- [Available Hooks](#available-hooks)
- [RPC System](#rpc-system)
- [Helper Functions](#helper-functions)
- [Development Workflow](#development-workflow)
- [Build System](#build-system)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Overview

The Next Blog plugin system allows developers to extend the functionality of the blog platform through hooks. Plugins
are developed in TypeScript and consist of three source files:

- `plugin.ts` - Plugin manifest with metadata
- `client.tsx` - Client-side hooks (UI components using JSX/React)
- `server.ts` - Server-side hooks (data processing)

These are compiled to JavaScript files (`plugin.js`, `client.js`, `server.js`) during the build process.

## Getting Started

### Prerequisites

- Node.js 18+ or Bun runtime
- TypeScript knowledge
- React/JSX for UI components
- Basic understanding of hooks and event-driven architecture

### Creating a New Plugin

1. **Create plugin directory structure:**

```bash
my-plugin/
├── src/
│   ├── plugin.ts      # Plugin manifest
│   ├── client.tsx     # Client-side hooks
│   └── server.ts      # Server-side hooks
├── tsconfig.json
└── package.json
```

2. **Install dependencies:**

```bash
npm install @supergrowthai/plugin-dev-kit
npm install -D typescript @types/react
```

3. **Configure package.json:**

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "next-blog build",
    "dev": "next-blog dev",
    "watch": "next-blog watch"
  },
  "devDependencies": {
    "@supergrowthai/plugin-dev-kit": "workspace:*",
    "@types/react": "^18.3.17",
    "typescript": "^5.7.3"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "nextBlog": {
    "baseUrl": "http://localhost:3248/plugins/my-plugin"
  }
}
```

4. **Start development server:**

```bash
npm run dev
# Plugin will be served at http://localhost:3248
```

## Plugin Structure

### Manifest File (plugin.ts)

```typescript
import {definePlugin} from '@supergrowthai/plugin-dev-kit';

export default definePlugin({
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'Description of your plugin',
    author: 'Your Name',
    permissions: ['blogs:read', 'blogs:write'],
    slots: ['dashboard-header', 'editor-sidebar'],
    // URLs are added during build
    client: {type: 'url', url: '...'},
    server: {type: 'url', url: '...'}
```

### Client-Side Hooks (client.tsx)

Client hooks render UI components using JSX/React. Each hook receives three parameters: SDK, previous value, and
context.

```typescript
import {defineClient} from '@supergrowthai/plugin-dev-kit';

export default defineClient({
    'dashboard-home:before': (sdk, prev, context) => {
        // prev is always null in current implementation
        return <div>Welcome
        message < /div>;
    },
    'blogs-list:before': (sdk, prev, context) => {
        // context contains zone, page, data, etc.
        return <div>Blog
        filters: {
            context.data?.length
        }
        blogs < /div>;
    }
});
```

### Server-Side Hooks (server.ts)

Server hooks process data and handle events. They receive an SDK and payload.

```typescript
import {defineServer} from '@supergrowthai/plugin-dev-kit';

export default defineServer({
    'blog:beforeCreate': async (sdk, payload) => {
        // Validate or modify blog data
        return payload;
    },
    'blog:afterUpdate': async (sdk, payload) => {
        // React to blog updates
        sdk.log.info('Blog updated:', payload.blogId);
    }
});

// For RPCs, export them separately
export const rpcs = {
    'myPlugin:getData': async (sdk: ServerSDK, request: any) => {
        // RPC handlers return {code, payload} or {code, message}
        return {code: 0, payload: {data: 'response'}};
    }
};
```

## Client SDK Reference

The Client SDK is passed to all client-side hooks:

### Properties

- **`apis`** - API client for making requests
    - `apis.getBlogs()` - Fetch blogs
    - `apis.getBlog(id)` - Fetch single blog
    - `apis.createBlog(data)` - Create blog
    - `apis.updateBlog(id, data)` - Update blog
    - `apis.deleteBlog(id)` - Delete blog
    - Similar methods for categories, tags, users, settings

- **`user`** - Current user object
    - `user.id` - User ID
    - `user.username` - Username
    - `user.email` - Email
    - `user.permissions` - Array of permission strings

- **`utils`** - Utility functions (optional)
    - `utils.debounce(func, delay)` - Debounce function

### Methods

- **`notify(message, status)`** - Show notification
    - `status`: 'success' | 'error' | 'info' | 'warning'

- **`refresh()`** - Re-render the plugin component

- **`navigate(path)`** - Navigate to a route (optional, not available in all contexts)

- **`callHook(hookName, payload)`** - Call another hook (simplified single signature)

### Context Object

The context object passed to UI hooks contains:

- **`zone`** - Extension zone name
- **`page`** - Current dashboard page (optional)
- **`entity`** - Entity type (blog, user, etc.) (optional)
- **`data`** - Relevant data for the hook (optional)
- **`actions`** - Available actions (optional)
- **`hookName`** - The actual hook name being executed

## Server SDK Reference

The Server SDK is passed to all server-side hooks:

### Properties

- **`log`** - Logger instance
    - `log.debug(message, ...args)`
    - `log.info(message, ...args)`
    - `log.warn(message, ...args)`
    - `log.error(message, ...args)`

- **`db`** - Database adapter
    - `db.blogs` - Blog operations
    - `db.users` - User operations
    - `db.categories` - Category operations
    - `db.tags` - Tag operations
    - `db.settings` - Settings operations
    - `db.plugins` - Plugin operations
    - `db.pluginHookMappings` - Hook mapping operations

- **`config`** - Server configuration
    - `config.environment` - 'development' | 'staging' | 'production'
    - `config.debug` - Debug mode flag
    - `config.baseUrl` - Base URL
    - `config.features` - Feature flags

- **`cache`** - Cache interface (optional, requires plugin fingerprinting)
    - `cache.get(key)` - Get cached value
    - `cache.set(key, value, ttl)` - Set value with TTL
    - `cache.delete(key)` - Delete cached value
    - `cache.clear()` - Clear all cache

- **`storage`** - Plugin storage (optional, implemented via ServerStorageHelper)
    - `storage.get(key)` - Get stored value
    - `storage.set(key, value)` - Store value
    - `storage.delete(key)` - Delete value

### Methods

- **`callHook(hookName, payload)`** - Call another hook (simplified single signature)
- **`callRPC(method, request)`** - Call an RPC method (optional, server-only)

## RPC System

### Overview

RPCs (Remote Procedure Calls) allow server-side plugin functions to be called from the API endpoint
`/api/plugins/rpc/:rpcName`.

### Defining RPCs

RPCs are defined as a separate export in your server.ts file and return values directly:

```typescript
// server.ts
import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {ServerSDK} from '@supergrowthai/plugin-dev-kit';

// Hooks export (default)
export default defineServer({
    'blog:beforeCreate': async (sdk, payload) => {
        // Hook logic
        return payload;
    }
});

// RPCs export (named export, separate from hooks)
export const rpcs = {
    'myPlugin:calculate': async (sdk: ServerSDK, request: { a: number, b: number }) => {
        const result = request.a + request.b;
        return {result};
    },

    'myPlugin:validate': async (sdk: ServerSDK, request: { data: any }) => {
        const isValid = validateData(request.data);
        if (!isValid) {
            throw new Error('Invalid data format');
        }
        return {valid: true};
    }
};
```

### Calling RPCs

RPCs are called via the API endpoint:

```bash
POST /api/plugins/rpc/myPlugin:calculate
Content-Type: application/json

{"a": 5, "b": 3}
```

The response will be wrapped in the standard API response format.

## Available Hooks

### UI Zones (ExtensionZones)

Each zone automatically provides `:before` and `:after` hooks. These are the currently implemented zones:

#### Main Pages

- `dashboard-home` - Dashboard home page
- `blogs-list` - Blogs listing page
- `categories-list` - Categories page
- `tags-list` - Tags page
- `users-list` - Users page
- `settings-list` - Settings page
- `plugins-list` - Plugins page

#### Table Sections

- `blog-table` - Blog table area
- `user-table` - User table area
- `categories-table` - Categories table
- `tags-table` - Tags table
- `settings-table` - Settings table
- `plugins-table` - Plugins table

#### Dashboard Sections

- `quick-draft` - Quick draft widget
- `stats-section` - Dashboard statistics

### Legacy Slot Positions (Deprecated)

These positions are maintained for backward compatibility but should be replaced with ExtensionZones:

- `dashboard-header` - Dashboard header area
- `dashboard-widget` - Dashboard widget area
- `dashboard-footer` - Dashboard footer
- `editor-sidebar-widget` - Editor sidebar

### Server Event Hooks

#### Blog Events

- `blog:beforeCreate` - Before blog creation
- `blog:afterCreate` - After blog creation
- `blog:beforeUpdate` - Before blog update
- `blog:afterUpdate` - After blog update
- `blog:beforeDelete` - Before blog deletion
- `blog:afterDelete` - After blog deletion
- `blog:onRead` - On blog read
- `blog:onList` - On blog list

#### User Events

- `user:beforeCreate` - Before user creation
- `user:afterCreate` - After user creation
- `user:beforeUpdate` - Before user update
- `user:afterUpdate` - After user update
- `user:beforeDelete` - Before user deletion
- `user:afterDelete` - After user deletion

#### Auth Events

- `auth:beforeLogin` - Before login
- `auth:afterLogin` - After login
- `auth:beforeLogout` - Before logout
- `auth:afterLogout` - After logout

#### Category Events

- `category:beforeCreate` - Before category creation
- `category:afterCreate` - After category creation
- `category:beforeUpdate` - Before category update
- `category:afterUpdate` - After category update
- `category:beforeDelete` - Before category deletion
- `category:afterDelete` - After category deletion

#### Tag Events

- `tag:beforeCreate` - Before tag creation
- `tag:afterCreate` - After tag creation
- `tag:beforeUpdate` - Before tag update
- `tag:afterUpdate` - After tag update
- `tag:beforeDelete` - Before tag deletion
- `tag:afterDelete` - After tag deletion

#### Plugin Events

- `plugin:beforeInstall` - Before plugin install
- `plugin:afterInstall` - After plugin install
- `plugin:beforeUninstall` - Before uninstall
- `plugin:afterUninstall` - After uninstall
- `plugin:beforeEnable` - Before enable
- `plugin:afterEnable` - After enable
- `plugin:beforeDisable` - Before disable
- `plugin:afterDisable` - After disable

#### Settings Events

- `setting:beforeUpdate` - Before setting update
- `setting:afterUpdate` - After setting update

## Dynamic Hook Patterns

### ExtensionZone Component

The dashboard uses `ExtensionZone` components to automatically create `:before` and `:after` hooks:

```tsx
<ExtensionZone name="blogs-list" page="blogs" data={blogs}>
    <BlogsTable/>
</ExtensionZone>
```

This creates two hook points:

- `blogs-list:before` - Rendered before the BlogsTable
- `blogs-list:after` - Rendered after the BlogsTable

### Zone Patterns

Use wildcards to match multiple zones:

- `*:before` - Before any zone
- `*:after` - After any zone
- `dashboard-*:before` - Before any dashboard zone
- `*-list:after` - After any list zone

### Entity Patterns

- `blog:*` - All blog events
- `*:beforeCreate` - Before any entity creation
- `*:after*` - All after events

## Hook Payloads

### Blog Hook Payloads

```typescript
// blog:beforeCreate
Payload: {
    title: string;
    content: string;
    data?: any;
}
Response: The modified payload or void

// blog:afterUpdate
Payload: {
    blogId: string;
    data?: any;
    previousData?: any;
}
Response: void

// blog:beforeDelete
Payload: {
    blogId: string;
    data?: any;
}
Response: void (throw error to prevent deletion)
```

### User Hook Payloads

```typescript
// user:beforeCreate
Payload: {
    email: string;
    username: string;
    data?: any;
}
Response: void | { data?: any }

// user:afterCreate
Payload: {
    userId: string;
    data?: any;
}
Response: void
```

### Auth Hook Payloads

```typescript
// auth:beforeLogin
Payload: {
    username: string;
    metadata?: any;
}
Response: void | { cancel?: boolean } // Return { cancel: true } to prevent login

// auth:afterLogin
Payload: {
    userId: string;
    sessionId?: string;
}
Response: void
```

## Helper Functions

The plugin-dev-kit provides helper functions for better developer experience:

### definePlugin

Type-safe plugin manifest definition:

```typescript
import { definePlugin } from '@supergrowthai/plugin-dev-kit';

export default definePlugin({
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'Plugin description'
});
```

### defineClient

Type-safe client hooks definition that returns a module with the hooks:

```typescript
import {defineClient} from '@supergrowthai/plugin-dev-kit';

export default defineClient({
    'dashboard-home:before': (sdk, prev, context) => {
        // prev is always null in current implementation
        return <HeaderWidget / >;
    },
    'blogs-list:before': (sdk, prev, context) => {
        // context contains zone, page, data, etc.
        return <BlogsToolbar data = {context.data}
        />;
    }
});
// Returns: { name: '', version: '', hooks: {...} }
```

### defineServer

Type-safe server hooks that returns hooks directly:

```typescript
import { defineServer } from '@supergrowthai/plugin-dev-kit';

export default defineServer({
    'blog:beforeCreate': async (sdk, payload) => {
        // Validate blog data
        if (!payload.title) {
            throw new Error('Title is required');
        }
        return payload;
    }
});
```

### createComponent

Helper for creating UI components with proper types:

```typescript
import { createComponent } from '@supergrowthai/plugin-dev-kit';
import { useState } from 'react';

const MyWidget = createComponent((sdk, context) => {
    const [state, setState] = useState(0);
    return <div>Widget content: {state}</div>;
});
```

### createAsyncHook

Helper for async server hooks with error handling:

```typescript
import { createAsyncHook } from '@supergrowthai/plugin-dev-kit';

const validateBlog = createAsyncHook(async (sdk, payload) => {
    if (!payload.title) throw new Error('Title required');
    return payload;
});
```

### combineHooks

Combine multiple hook definitions:

```typescript
import { combineHooks } from '@supergrowthai/plugin-dev-kit';

const dashboardHooks = {
    'dashboard-header': HeaderWidget,
    'dashboard-footer': FooterWidget,
};

const editorHooks = {
    'editor-sidebar-widget': SidebarWidget,
};

export default defineClient(combineHooks(dashboardHooks, editorHooks));
```

## Development Workflow

### Local Development

1. **Start the development server:**

```bash
# In your plugin directory
npm run dev
# Serves at http://localhost:3248 by default
```

2. **Install plugin in dashboard:**

- Navigate to Plugins page in dashboard
- Enter your local plugin URL: `http://localhost:3248/plugins/my-plugin/plugin.js`
- Click Install

3. **Hot Reload:**

- Changes to source files automatically rebuild
- Use `sdk.refresh()` in client code to trigger re-render
- Server changes require plugin reload

### Testing Hooks

Test your hooks by navigating to the relevant dashboard pages:

- Dashboard home for `dashboard-home:before/after`
- Blogs list for `blogs-list:before/after`
- Blog editor for `editor-sidebar-widget`

### Debugging

**Client-side:**

```typescript
// Use browser DevTools
console.log(`[Plugin: ${sdk.pluginId}]`, data);
sdk.notify('Debug message', 'info');
```

**Server-side:**

```typescript
// Use SDK logger
sdk.log.debug('Debug message', payload);
sdk.log.info('Processing:', data);
```

## Build System

The Next Blog plugin system uses a built-in CLI tool (`next-blog`) to handle the build process. This tool automatically
handles bundling, transpilation, and serving of your plugin files.

### TypeScript Configuration

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "declaration": true,
    "declarationDir": "./dist",
    "outDir": "./dist",
    "lib": [
      "ES2020",
      "DOM",
      "DOM.Iterable"
    ]
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

### CLI Commands

- **`next-blog dev`** - Start development server with hot reload
- **`next-blog build`** - Build plugin for production
- **`next-blog watch`** - Watch mode for continuous building

The CLI automatically:

- Bundles TypeScript and JSX/TSX files
- Handles React as an external dependency
- Generates IIFE format for browser compatibility
- Serves files with CORS enabled during development
- Creates plugin.js, client.js, and server.js outputs

## Performance Optimization

The plugin system uses hook indexing for O(1) performance:

- Exact hook matches are looked up instantly
- Pattern-based hooks are checked against a small index
- Plugins are deduplicated to prevent multiple executions
- Plugin SDK operations are automatically scoped/fingerprinted

## Best Practices

1. **Use specific hook names** when possible for better performance
2. **Return quickly** from hooks to avoid blocking the UI
3. **Handle errors gracefully** in server hooks
4. **Use the SDK's logger** instead of console.log in server code
5. **Validate payloads** before processing
6. **Use TypeScript** with the plugin-dev-kit for type safety
7. **Keep plugins focused** - one feature per plugin
8. **Document your hooks** for other developers
9. **Test hooks thoroughly** in development before deploying
10. **Use ExtensionZone patterns** to hook into UI areas
11. **Remember prev parameter** is always null in client hooks currently
12. **Handle errors gracefully** in both client and server hooks

## Example: Simple Dashboard Widget

```typescript
// plugin.ts
import {definePlugin} from '@supergrowthai/plugin-dev-kit';

export default definePlugin({
    id: 'welcome-widget',
    name: 'Welcome Widget',
    version: '1.0.0',
    description: 'Shows a welcome message',
    slots: ['dashboard-home:before']
});

// client.tsx
import {defineClient} from '@supergrowthai/plugin-dev-kit';

export default defineClient({
    'dashboard-home:before': (sdk, prev, context) => {
        const userName = sdk.user?.username || 'User';
        return (
            <div className = "p-4 bg-blue-100 rounded mb-4" >
                <h2>Welcome
        back, {userName}! < /h2>
        < p > Have
        a
        great
        day! < /p>
        < /div>
    )
        ;
    }
});

// server.ts (minimal for UI-only plugins)
import {defineServer} from '@supergrowthai/plugin-dev-kit';

export default defineServer({});
```

## Example: Blog Validator Plugin

```typescript
// plugin.ts
import {definePlugin} from '@supergrowthai/plugin-dev-kit';

export default definePlugin({
    id: 'blog-validator',
    name: 'Blog Validator',
    version: '1.0.0',
    description: 'Validates blog posts before saving',
    permissions: ['blogs:read', 'blogs:write']
});

// client.tsx
import {defineClient} from '@supergrowthai/plugin-dev-kit';

export default defineClient({
    'blogs-list:after': (sdk, prev, context) => {
        return (
            <div className = "mt-2 text-sm text-gray-600" >
                ✓ Validation
        active
        for {
            context.data?.length || 0
        }
        blogs
        < /div>
    )
        ;
    }
});

// server.ts
import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {ServerSDK} from '@supergrowthai/plugin-dev-kit';

export default defineServer({
    'blog:beforeCreate': async (sdk: ServerSDK, payload: any) => {
        // Validate title length
        if (payload.title.length < 10) {
            throw new Error('Title must be at least 10 characters');
        }

        // Validate content
        if (payload.content.length < 100) {
            throw new Error('Content must be at least 100 characters');
        }

        // Log validation
        sdk.log.info('Blog validated successfully');

        return payload;
    },
    'blog:beforeUpdate': async (sdk: ServerSDK, payload: any) => {
        // Same validation for updates
        if (payload.updates.title && payload.updates.title.length < 10) {
            throw new Error('Title must be at least 10 characters');
        }
        return payload;
    }
});

// RPCs for server functionality
export const rpcs = {
    'validator:check': async (sdk: ServerSDK, request: { content: string }) => {
        const isValid = request.content.length >= 100;
        return {valid: isValid};
    }
};
```