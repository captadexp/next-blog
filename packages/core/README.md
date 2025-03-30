# Next-Blog Core

Add blogging to your nextjs project in a jiffy.

This package has been migrated to a Vite-based build system with Bun as the package manager.

## Development

```bash
# Install dependencies
bun install

# Build in watch mode
bun run dev

# Production build
bun run build
```

## Usage

This package is intended to be used with Next.js applications. See the main project README for detailed usage
instructions.

## Package Exports

The package exports the following modules:

### Main module

```js
import nextBlog, {FileDBAdapter, MongoDBAdapter} from '@supergrowthai/next-blog';
```

### Adapters (alternative import path)

```js
import {FileDBAdapter, MongoDBAdapter} from '@supergrowthai/next-blog/adapters';
```

### Types

```js
import type {Configuration} from '@supergrowthai/next-blog/types';
```

### UI (future use)

The UI module is reserved for future customizable components.

```js
// Reserved for future use
// import { ... } from '@supergrowthai/next-blog/ui';
```