import {defineServer} from '@supergrowthai/plugin-dev-kit';
import {blogHooks} from './server/hooks/blog-hooks.js';
import {rpcHandlers} from './server/rpc/handlers.js';
import './types/rpc-types.js';

// Server-side hooks that run in Node.js
export default defineServer({
    hooks: blogHooks,
    rpcs: rpcHandlers
});
