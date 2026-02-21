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
2. `bun pm pack` each package into tarballs in a temp dir
3. Copy a fixture Next.js app to `/tmp`
4. `bun install` from tarballs (using `overrides` for transitive resolution)
5. `bun run build` the Next.js app (proves embedded assets survive consumer bundling)
6. Start with `mongodb-memory-server` as DB
7. `curl` dashboard endpoint + JS assets, assert HTTP 200
8. Clean up

## Learnings from Manual Run (2026-02-21)

### Use `bun pm pack`, NOT `npm pack`

`npm pack` does **not** resolve `workspace:*` dependencies in the tarball's internal `package.json`. When a consumer installs the tarball, bun sees `workspace:*` and fails because there's no workspace context.

`bun pm pack` correctly resolves `workspace:*` → real version numbers (e.g., `workspace:*` → `1.0.9`).

```bash
# WRONG — leaves workspace:* in tarball
npm pack --pack-destination /tmp/tarballs

# CORRECT — resolves workspace:* to real versions
bun pm pack --destination /tmp/tarballs
```

### Transitive deps need `overrides` in package.json

Even with `bun pm pack` resolving `workspace:*` to real versions, the tarballs' internal deps (e.g., `@supergrowthai/jsx-runtime@1.0.0`) still try to resolve from the npm registry — where our private packages don't exist.

**Solution**: Add an `overrides` section in the test app's `package.json` that forces ALL `@supergrowthai/*` packages to resolve from local tarballs:

```json
{
  "dependencies": {
    "@supergrowthai/next-blog": "file:../tarballs/supergrowthai-next-blog-3.0.9.tgz",
    ...
  },
  "overrides": {
    "@supergrowthai/next-blog": "file:../tarballs/supergrowthai-next-blog-3.0.9.tgz",
    "@supergrowthai/next-blog-types": "file:../tarballs/supergrowthai-next-blog-types-1.0.9.tgz",
    "@supergrowthai/utils": "file:../tarballs/supergrowthai-utils-1.0.1.tgz",
    "@supergrowthai/oneapi": "file:../tarballs/supergrowthai-oneapi-2.0.9.tgz",
    "@supergrowthai/jsx-runtime": "file:../tarballs/supergrowthai-jsx-runtime-1.0.0.tgz",
    "@supergrowthai/next-blog-dashboard": "file:../tarballs/supergrowthai-next-blog-dashboard-1.0.0.tgz",
    "@supergrowthai/mq": "file:../tarballs/supergrowthai-mq-1.0.10.tgz",
    "@supergrowthai/tq": "file:../tarballs/supergrowthai-tq-1.0.10.tgz"
  }
}
```

Without `overrides`, `bun install` succeeds for direct deps but `next build` fails when yarn (Next.js auto-installer) tries to resolve transitive `@supergrowthai/*` deps from npm.

### Include TypeScript devDependencies upfront

Next.js 16 auto-detects TypeScript and tries to install `typescript`, `@types/react`, `@types/node` via **yarn** (not bun) if they're missing. This fails because yarn doesn't have access to our overrides and hits npm for `@supergrowthai/*` transitive deps.

**Solution**: Always include TS deps in the fixture's `devDependencies`:

```json
{
  "devDependencies": {
    "typescript": "^5.9.3",
    "@types/react": "^19.2.14",
    "@types/node": "^25.3.0"
  }
}
```

### No `transpilePackages` needed

When consuming from tarballs (pre-built dist), `transpilePackages` is unnecessary. That config is only needed when importing source TS from workspace packages.

## Directory Structure

```
tests/
  integration/
    PLAN.md                         <- This file
    test-packed-install.sh          <- Main orchestrator (bash)
    README.md                       <- How to run, extend
    fixtures/
      app/
        package.json                <- With file:// tarball paths + overrides
        next.config.js              <- Minimal config (no transpilePackages)
        tsconfig.json               <- Standard Next.js tsconfig
        app/
          layout.tsx                <- Minimal root layout
          page.tsx                  <- Simple home page
          api/
            next-blog/
              [[...page]]/
                route.ts            <- API route handler
        lib/
          db.ts                     <- MongoDBAdapter + mongodb-memory-server
          config.ts                 <- next-blog config
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
    if (!g._mongoClient) {
        const mongod = await MongoMemoryServer.create();
        g._mongod = mongod;
        g._mongoClient = await new MongoClient(mongod.getUri()).connect();
        console.log(`[integration-test] MongoDB Memory Server: ${mongod.getUri()}`);
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

## Packages to Pack

| Package | Dir | Tarball Name |
|---------|-----|-------------|
| `@supergrowthai/next-blog` | `packages/core` | `supergrowthai-next-blog-{version}.tgz` |
| `@supergrowthai/next-blog-types` | `packages/types` | `supergrowthai-next-blog-types-{version}.tgz` |
| `@supergrowthai/utils` | `packages/utils` | `supergrowthai-utils-{version}.tgz` |
| `@supergrowthai/oneapi` | `lib/oneapi` | `supergrowthai-oneapi-{version}.tgz` |
| `@supergrowthai/jsx-runtime` | `packages/jsx-runtime` | `supergrowthai-jsx-runtime-{version}.tgz` |
| `@supergrowthai/next-blog-dashboard` | `packages/dashboard` | `supergrowthai-next-blog-dashboard-{version}.tgz` |
| `@supergrowthai/mq` | `lib/mq` | `supergrowthai-mq-{version}.tgz` |
| `@supergrowthai/tq` | `lib/tq` | `supergrowthai-tq-{version}.tgz` |

## Shell Script Shape

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TMP_DIR=$(mktemp -d)
TARBALLS_DIR="$TMP_DIR/tarballs"
APP_DIR="$TMP_DIR/test-app"
PORT=20000
SERVER_PID=""

cleanup() {
    [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT

# 1. Build all packages
cd "$REPO_ROOT" && bun run build

# 2. Pack each into $TARBALLS_DIR using bun pm pack (NOT npm pack)
mkdir -p "$TARBALLS_DIR"
for pkg in packages/core packages/types packages/utils packages/dashboard \
           packages/jsx-runtime lib/oneapi lib/mq lib/tq; do
    cd "$REPO_ROOT/$pkg"
    bun pm pack --destination "$TARBALLS_DIR"
done

# 3. Copy fixtures/app -> $APP_DIR
cp -r "$SCRIPT_DIR/fixtures/app" "$APP_DIR"

# 4. Inject tarball file:// paths into package.json
#    (sed to replace placeholders, or pre-bake paths in fixture)

# 5. bun install (overrides handle transitive resolution)
cd "$APP_DIR" && bun install

# 6. bun run build
bun run build

# 7. bun run start & -> SERVER_PID
bun run start &
SERVER_PID=$!

# 8. Wait for ready, run assertions
for i in $(seq 1 30); do
    curl -sf "http://localhost:$PORT" >/dev/null 2>&1 && break
    sleep 1
done

assert_http() {
    local url="$1" expect="$2" label="$3"
    local status=$(curl -sf -o /dev/null -w "%{http_code}" "$url" || echo "000")
    if [ "$status" = "$expect" ]; then
        echo "PASS $label (HTTP $status)"; return 0
    else
        echo "FAIL $label (HTTP $status, expected $expect)"; return 1
    fi
}

assert_contains() {
    local url="$1" pattern="$2" label="$3"
    if curl -sf "$url" | grep -q "$pattern"; then
        echo "PASS $label"; return 0
    else
        echo "FAIL $label — pattern '$pattern' not found"; return 1
    fi
}

FAIL=0
assert_contains "http://localhost:$PORT/api/next-blog/dashboard" "dashboard.js" \
    "Dashboard HTML references dashboard.js" || FAIL=$((FAIL+1))
assert_http "http://localhost:$PORT/api/next-blog/dashboard/static/dashboard.js" "200" \
    "dashboard.js from embedded map" || FAIL=$((FAIL+1))
assert_http "http://localhost:$PORT/api/next-blog/dashboard/static/plugin-runtime.js" "200" \
    "plugin-runtime.js from embedded map" || FAIL=$((FAIL+1))
assert_http "http://localhost:$PORT/api/next-blog/dashboard/static/internal-plugins/system/plugin.js" "200" \
    "internal plugin JS from embedded map" || FAIL=$((FAIL+1))

[ "$FAIL" -eq 0 ] && echo "All tests passed!" || { echo "$FAIL test(s) failed"; exit 1; }
```

## Assertions

| Check | URL | Assertion |
|-------|-----|-----------|
| Dashboard HTML | `/api/next-blog/dashboard` | Contains `dashboard.js` |
| dashboard.js | `/api/next-blog/dashboard/static/dashboard.js` | HTTP 200 |
| plugin-runtime.js | `/api/next-blog/dashboard/static/plugin-runtime.js` | HTTP 200 |
| Internal plugin | `/api/next-blog/dashboard/static/internal-plugins/system/plugin.js` | HTTP 200 |

## Extensibility

Future additions without structural changes:
- **Update testing**: Pack v1 -> install -> run -> pack v2 -> `bun update` -> verify migration
- **Adapter variants**: Second fixture with FileDBAdapter
- **Plugin lifecycle**: POST to plugin install API, assert response
- **CI**: Script exits 0/1 — drop into GitHub Actions
- **More assertions**: Just add `assert_http`/`assert_contains` calls