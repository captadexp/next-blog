# Integration Test Plan: Packed Install with In-Memory MongoDB

## Goal

Verify that `@supergrowthai/next-blog` works correctly when installed from **packed tarballs** (not workspace links) into a fresh Next.js app with an in-memory MongoDB — simulating what a real consumer sees.

This validates:
- Embedded dashboard assets survive bundling and serve correctly
- Zero filesystem dependency for static assets
- Internal plugins load from embedded map
- MongoDBAdapter works end-to-end

## How It Works

1. `bun run build` all monorepo packages
2. `bun pack` each package into tarballs in a temp dir
3. Copy a fixture Next.js app to `/tmp`
4. Inject tarball `file://` paths into `package.json` (replacing placeholders)
5. `bun install` from tarballs
6. `bun run build` the Next.js app (proves embedded assets survive consumer bundling)
7. Start with `mongodb-memory-server` as DB
8. `curl` dashboard endpoint + JS assets, assert HTTP 200
9. Clean up

## Directory Structure

```
tests/
  integration/
    PLAN.md                         ← This file
    test-packed-install.sh          ← Main orchestrator (bash)
    README.md                       ← How to run, extend
    fixtures/
      app/
        package.json                ← Template with __TARBALL__ placeholders
        next.config.js              ← Minimal config (no transpilePackages)
        tsconfig.json               ← Standard Next.js tsconfig
        app/
          layout.tsx                ← Minimal root layout
          page.tsx                  ← Simple home page
          api/
            next-blog/
              [[...page]]/
                route.ts            ← API route handler
        lib/
          db.ts                     ← MongoDBAdapter + mongodb-memory-server
          config.ts                 ← next-blog config
```

## Fixture Details

### `lib/db.ts` — MongoDB Memory Server

```ts
import * as adapters from "@supergrowthai/next-blog/adapters";
import type {DatabaseAdapter} from "@supergrowthai/next-blog";
import {MongoClient} from "mongodb";
import {MongoMemoryServer} from "mongodb-memory-server";

const g = globalThis as any;

async function getClient(): Promise<MongoClient> {
    if (!g._mongod) {
        g._mongod = await MongoMemoryServer.create();
        g._mongoClient = new MongoClient(g._mongod.getUri()).connect();
        console.log(`[test] Memory MongoDB: ${g._mongod.getUri()}`);
    }
    return g._mongoClient;
}

export const dbProvider = async (): Promise<DatabaseAdapter> => {
    const client = await getClient();
    return new adapters.MongoDBAdapter("integration-test", client);
};
```

### `lib/config.ts`

```ts
import {dbProvider} from "./db";

export default function () {
    return {
        db: dbProvider,
        ui: { branding: { name: "Integration Test", description: "Packed install test" } }
    };
}
```

### `app/api/next-blog/[[...page]]/route.ts`

```ts
import {nextBlog} from "@supergrowthai/next-blog/next";
import config from "../../../../lib/config";
const {GET, POST} = nextBlog(config());
export {GET, POST};
```

### `next.config.js`

```js
module.exports = { reactStrictMode: true };
```

No `transpilePackages` — consuming pre-built dist from tarballs.

### `package.json` (template)

```json
{
  "name": "integration-test-app",
  "private": true,
  "scripts": {
    "build": "next build",
    "start": "next start -p 3999"
  },
  "dependencies": {
    "next": "^16.1.6",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "mongodb": "^7.1.0",
    "mongodb-memory-server": "^10.4.0",
    "memoose-js": "3.0.1",
    "@supergrowthai/next-blog": "__CORE_TARBALL__",
    "@supergrowthai/next-blog-types": "__TYPES_TARBALL__",
    "@supergrowthai/utils": "__UTILS_TARBALL__",
    "@supergrowthai/oneapi": "__ONEAPI_TARBALL__",
    "@supergrowthai/jsx-runtime": "__JSX_TARBALL__",
    "@supergrowthai/next-blog-dashboard": "__DASHBOARD_TARBALL__",
    "@supergrowthai/mq": "__MQ_TARBALL__",
    "@supergrowthai/tq": "__TQ_TARBALL__"
  }
}
```

## Packages to Pack

| Package | Dir | Placeholder |
|---------|-----|-------------|
| `@supergrowthai/next-blog` | `packages/core` | `__CORE_TARBALL__` |
| `@supergrowthai/next-blog-types` | `packages/types` | `__TYPES_TARBALL__` |
| `@supergrowthai/utils` | `packages/utils` | `__UTILS_TARBALL__` |
| `@supergrowthai/oneapi` | `lib/oneapi` | `__ONEAPI_TARBALL__` |
| `@supergrowthai/jsx-runtime` | `packages/jsx-runtime` | `__JSX_TARBALL__` |
| `@supergrowthai/next-blog-dashboard` | `packages/dashboard` | `__DASHBOARD_TARBALL__` |
| `@supergrowthai/mq` | `lib/mq` | `__MQ_TARBALL__` |
| `@supergrowthai/tq` | `lib/tq` | `__TQ_TARBALL__` |

## Shell Script Shape

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TMP_DIR=$(mktemp -d)
TARBALLS_DIR="$TMP_DIR/tarballs"
APP_DIR="$TMP_DIR/test-app"
PORT=3999
SERVER_PID=""

cleanup() {
    [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT

# 1. Build all packages
# 2. Pack each into $TARBALLS_DIR
# 3. Copy fixtures/app → $APP_DIR
# 4. sed replace __*_TARBALL__ with file:// paths
# 5. bun install
# 6. bun run build
# 7. bun run start & → SERVER_PID
# 8. Wait for ready, run assertions
# 9. Exit 0/1

assert_http() {
    local url="$1" expect="$2" label="$3"
    local status=$(curl -sf -o /dev/null -w "%{http_code}" "$url" || echo "000")
    if [ "$status" = "$expect" ]; then
        echo "✅ $label (HTTP $status)"; return 0
    else
        echo "❌ $label (HTTP $status, expected $expect)"; return 1
    fi
}

assert_contains() {
    local url="$1" pattern="$2" label="$3"
    if curl -sf "$url" | grep -q "$pattern"; then
        echo "✅ $label"; return 0
    else
        echo "❌ $label — pattern '$pattern' not found"; return 1
    fi
}
```

## Assertions

| Check | URL | Assertion |
|-------|-----|-----------|
| Dashboard HTML | `/api/next-blog/dashboard` | Contains `dashboard.js` |
| dashboard.js | `/api/next-blog/dashboard/static/dashboard.js` | HTTP 200 |
| plugin-runtime.js | `/api/next-blog/dashboard/static/plugin-runtime.js` | HTTP 200 |

## Extensibility

Future additions without structural changes:
- **Update testing**: Pack v1 → install → run → pack v2 → `bun update` → verify migration
- **Adapter variants**: Second fixture with FileDBAdapter
- **Plugin lifecycle**: POST to plugin install API, assert response
- **CI**: Script exits 0/1 — drop into GitHub Actions
- **More assertions**: Just add `assert_http`/`assert_contains` calls