import './styles.css';

export default function CreatePluginPage() {
    return (
        <div className="plugin-docs-container">
            <h1 className="plugin-docs-title">Creating Next-Blog Plugins</h1>

            <div className="space-y-8">
                <section>
                    <h2 className="text-2xl font-semibold mb-4">Overview</h2>
                    <p className="mb-4">
                        Next-Blog plugins extend the platform through a hook-based system. Each plugin consists of three
                        TypeScript files that are compiled to JavaScript:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><code className="bg-gray-100 px-1">src/plugin.ts</code> - Plugin manifest with metadata
                            (compiled to plugin.js)
                        </li>
                        <li><code className="bg-gray-100 px-1">src/client.tsx</code> - Client-side UI hooks using
                            React/JSX (compiled to client.js)
                        </li>
                        <li><code className="bg-gray-100 px-1">src/server.ts</code> - Server-side hooks and RPCs
                            (compiled to server.js)
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">1. Create a new plugin:</h3>
                        <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto">
              <code>{`bunx create-next-blog-plugin my-plugin
cd my-plugin`}</code>
            </pre>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg mt-4">
                        <h3 className="font-semibold mb-2">2. Install dependencies:</h3>
                        <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto">
              <code>{`bun install`}</code>
            </pre>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg mt-4">
                        <h3 className="font-semibold mb-2">3. Start development server:</h3>
                        <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto">
              <code>{`bun run dev
# Server starts on random port 60000-65535
# Or specify a port:
bun run dev --port 3248`}</code>
            </pre>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg mt-4">
                        <h3 className="font-semibold mb-2">4. Build for production:</h3>
                        <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto">
              <code>{`bun run build`}</code>
            </pre>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4">Plugin Structure</h2>
                    <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto">
            <code>{`my-plugin/
├── src/
│   ├── plugin.ts      # Plugin manifest
│   ├── client.tsx     # Client-side UI hooks
│   └── server.ts      # Server-side hooks
├── dist/              # Built output (gitignored)
│   ├── plugin.js
│   ├── client.js
│   └── server.js
├── package.json
├── tsconfig.json
└── plugin-env.d.ts`}</code>
          </pre>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4">Plugin Manifest (plugin.ts)</h2>
                    <p className="mb-4">Define your plugin metadata using the <code
                        className="bg-gray-100 px-1">definePlugin</code> helper:</p>
                    <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto">
            <code>{`import { definePlugin } from '@supergrowthai/plugin-dev-kit';

export default definePlugin({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0', // Auto-updated from package.json
  description: 'A sample Next-Blog plugin',
  author: 'Your Name',
  permissions: ['blogs:read', 'blogs:write'], // Optional
  slots: ['dashboard-home:before'] // Optional: declare used slots
});`}</code>
          </pre>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4">Client Hooks (client.tsx)</h2>
                    <p className="mb-4">Use <code className="bg-gray-100 px-1">defineClient</code> to create UI hooks
                        with React components:</p>
                    <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto">
            <code>{`import { defineClient } from '@supergrowthai/plugin-dev-kit';

export default defineClient({
  // Hook into dashboard home page
  'dashboard-home:before': (sdk, prev, context) => {
    return (
      <div className="p-4 bg-blue-100 rounded mb-4">
        <h2>Welcome, {sdk.user?.username}!</h2>
        <button onClick={() => sdk.notify('Hello!', 'success')}>
          Show Notification
        </button>
      </div>
    );
  },
  
  // Add content after blogs list
  'blogs-list:after': (sdk, prev, context) => {
    const blogCount = context.data?.length || 0;
    return <p>Total blogs: {blogCount}</p>;
  },
  
  // Plugin settings panel (if hasSettingsPanel: true)
  'system:plugin:settings-panel': (sdk, prev, context) => {
    return <PluginSettings sdk={sdk} />;
  }
});

export const hasSettingsPanel = true; // Enable settings page`}</code>
          </pre>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4">Server Hooks (server.ts)</h2>
                    <p className="mb-4">Use <code className="bg-gray-100 px-1">defineServer</code> for server-side hooks
                        and export RPCs separately:</p>
                    <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto">
            <code>{`import { defineServer } from '@supergrowthai/plugin-dev-kit';
import type { ServerSDK } from '@supergrowthai/types/server';

// Server hooks
export default defineServer({
  'blog:beforeCreate': async (sdk, payload) => {
    sdk.log.info('Blog being created:', payload.title);
    
    // Validate
    if (payload.title.length < 5) {
      throw new Error('Title too short');
    }
    
    // Modify payload
    return {
      ...payload,
      metadata: { createdVia: 'my-plugin' }
    };
  },
  
  'auth:afterLogin': async (sdk, payload) => {
    sdk.log.info('User logged in:', payload.userId);
  }
});

// RPC methods (separate export)
export const rpcs = {
  'myPlugin:getData': async (sdk: ServerSDK, request: any) => {
    const blogs = await sdk.db.blogs.find({ status: 'published' });
    return { blogCount: blogs.length };
  }
};`}</code>
          </pre>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4">Available Hooks</h2>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">UI Extension Zones</h3>
                            <p className="mb-2 text-sm text-gray-600">Each zone provides :before and :after hooks</p>
                            <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li><code>dashboard-home</code> - Dashboard main page</li>
                                <li><code>blogs-list</code> - Blogs listing page</li>
                                <li><code>categories-list</code> - Categories page</li>
                                <li><code>tags-list</code> - Tags page</li>
                                <li><code>users-list</code> - Users page</li>
                                <li><code>settings-list</code> - Settings page</li>
                                <li><code>plugins-list</code> - Plugins page</li>
                                <li><code>blog-table</code> - Blog table area</li>
                                <li><code>stats-section</code> - Dashboard statistics</li>
                                <li><code>quick-draft</code> - Quick draft widget</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">Server Event Hooks</h3>
                            <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li><code>blog:beforeCreate</code>, <code>blog:afterCreate</code></li>
                                <li><code>blog:beforeUpdate</code>, <code>blog:afterUpdate</code></li>
                                <li><code>blog:beforeDelete</code>, <code>blog:afterDelete</code></li>
                                <li><code>user:beforeCreate</code>, <code>user:afterCreate</code></li>
                                <li><code>auth:beforeLogin</code>, <code>auth:afterLogin</code></li>
                                <li><code>category:beforeCreate</code>, <code>tag:beforeCreate</code></li>
                                <li>And many more...</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4">SDK Reference</h2>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">Client SDK</h3>
                            <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto text-sm">
                <code>{`sdk.user         // Current user object
sdk.apis         // API client for requests
sdk.notify()     // Show notifications
sdk.refresh()    // Re-render component
sdk.callHook()   // Call other hooks
sdk.storage      // Local storage (optional)
sdk.navigate()   // Navigation (optional)`}</code>
              </pre>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">Server SDK</h3>
                            <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto text-sm">
                <code>{`sdk.log          // Logger instance
sdk.db           // Database adapter
sdk.config       // Server configuration
sdk.callHook()   // Call other hooks
sdk.storage      // Plugin storage (optional)
sdk.cache        // Cache interface (optional)`}</code>
              </pre>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4">Package Configuration</h2>
                    <p className="mb-4">Configure your <code className="bg-gray-100 px-1">package.json</code>:</p>
                    <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto">
            <code>{`{
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
  "nextBlog": {
    "baseUrl": "http://localhost:3248/plugins/my-plugin"
  }
}`}</code>
          </pre>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4">Development Workflow</h2>
                    <div className="space-y-4">
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                            <h3 className="font-semibold mb-2">Development Mode</h3>
                            <p>Run <code className="bg-gray-100 px-1">bun run dev</code> to start a dev server on a
                                random port (60000-65535).</p>
                            <p className="mt-2">The server URL will be displayed - use this to install the plugin in
                                your dashboard.</p>
                        </div>

                        <div className="bg-green-50 border-l-4 border-green-500 p-4">
                            <h3 className="font-semibold mb-2">Installing Your Plugin</h3>
                            <ol className="list-decimal pl-6 space-y-1">
                                <li>Navigate to Plugins page in dashboard</li>
                                <li>Click "Add New Plugin"</li>
                                <li>Enter your dev server URL (e.g., <code
                                    className="bg-gray-100 px-1">http://localhost:62341/plugin.js</code>)
                                </li>
                                <li>Click Install</li>
                            </ol>
                        </div>

                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                            <h3 className="font-semibold mb-2">Hot Reload</h3>
                            <p>Client changes: Call <code className="bg-gray-100 px-1">sdk.refresh()</code> in your code
                            </p>
                            <p>Server changes: Reinstall the plugin from the dashboard</p>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4">RPC System</h2>
                    <p className="mb-4">RPCs allow server functions to be called via API:</p>
                    <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto">
            <code>{`// server.ts
export const rpcs = {
  'myPlugin:calculate': async (sdk, request) => {
    return { result: request.a + request.b };
  }
};

// Call via API:
POST /api/plugins/rpc/myPlugin:calculate
{"a": 5, "b": 3}

// Returns:
{"code": 0, "payload": {"result": 8}}`}</code>
          </pre>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4">Best Practices</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Use TypeScript for type safety</li>
                        <li>Handle errors gracefully in hooks</li>
                        <li>Use SDK logger instead of console.log on server</li>
                        <li>Keep plugins focused on a single feature</li>
                        <li>Test thoroughly before deploying</li>
                        <li>Use specific hook names for better performance</li>
                        <li>Return quickly from hooks to avoid blocking</li>
                        <li>Document your plugin's hooks and RPCs</li>
                    </ul>
                </section>

                <section className="border-t pt-6">
                    <h2 className="text-2xl font-semibold mb-4">Troubleshooting</h2>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-red-600">Common Issues:</h3>
                            <ul className="list-disc pl-6 space-y-2 mt-2">
                                <li>
                                    <strong>Plugin not loading</strong>
                                    <p className="text-sm text-gray-600">Ensure dev server is running and URL is
                                        correct</p>
                                </li>
                                <li>
                                    <strong>Hooks not executing</strong>
                                    <p className="text-sm text-gray-600">Check hook name matches exactly
                                        (case-sensitive)</p>
                                </li>
                                <li>
                                    <strong>RPC not found</strong>
                                    <p className="text-sm text-gray-600">Export RPCs as <code
                                        className="bg-gray-100 px-1">export const rpcs</code>, not in default export</p>
                                </li>
                                <li>
                                    <strong>TypeScript errors</strong>
                                    <p className="text-sm text-gray-600">Import types from @supergrowthai/types or
                                        @supergrowthai/plugin-dev-kit</p>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4">Example Plugins</h2>
                    <p className="mb-4">Learn from these example plugins in the codebase:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>seo-analyzer</strong> - Analyzes SEO metadata with UI widget</li>
                        <li><strong>broken-link-checker</strong> - Scans blog posts for broken links</li>
                        <li><strong>api-widget</strong> - Simple API integration example</li>
                    </ul>
                </section>
            </div>
        </div>
    );
}