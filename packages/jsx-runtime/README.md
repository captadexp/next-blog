# Secure JSX Runtime for Next-Blog Plugins

A minimal, secure JSX runtime for the Next-Blog plugin system that enables plugin developers to write JSX while
maintaining full control over security and sandboxing.

## Architecture

### Three Package System

1. **jsx-runtime** - The runtime loaded once by the dashboard
2. **plugin-dev-kit** - NPM package for plugin developers
3. **Your plugin** - Independent repo using the dev kit

## For Plugin Developers

### Quick Start

```bash
# Create new plugin project
mkdir my-plugin && cd my-plugin
npm init -y

# Install dev kit
npm install --save-dev @supergrowthai/plugin-dev-kit vite typescript

# Initialize plugin structure
npx create-next-blog-plugin

# Build your plugin
npm run build
```

### Writing a Plugin

```tsx
// src/index.tsx
import type {PluginModule, PluginSDK} from '@supergrowthai/plugin-dev-kit';

const MyPlugin: PluginModule = {
    name: 'My Plugin',
    version: '1.0.0',

    hooks: {
        'dashboard-widget': (sdk: PluginSDK) => {
            const {utils} = window.PluginRuntime;

            return (
                <div className="card">
                    <h3>Hello {sdk.user?.name}!</h3>
                    <button onClick={() => sdk.notify('Clicked!', 'success')}>
                        Click Me
                    </button>
                </div>
            );
        }
    }
};

export default MyPlugin;
```

### Available Utilities

The runtime provides these utilities via `window.PluginRuntime.utils`:

- `classList(...classes)` - Combine class names
- `styles(obj)` - Convert style object to string
- `debounce(fn, delay)` - Debounce function calls
- `throttle(fn, delay)` - Throttle function calls
- `formatDate(date, format)` - Format dates
- `formatNumber(num, options)` - Format numbers

### SDK Interface

Each hook receives an SDK object with:

```typescript
interface PluginSDK {
    apis: APIClient;           // API access
    user: User | null;         // Current user
    settings: Record<string, any>; // App settings
    notify: (msg, type) => void;   // Show notifications
    refresh: () => void;       // Trigger re-render
    storage: Storage;          // Local storage
    navigate: (path) => void;  // Navigation
    callHook: (id, payload) => Promise; // Call other hooks
}
```

### Testing Your Plugin

```javascript
// test.js
import {createMockSDK, testPlugin} from '@supergrowthai/plugin-dev-kit';
import plugin from './src/index.js';

testPlugin(plugin, {
    hook: 'dashboard-widget',
    render: true
});
```

## How It Works

1. **JSX Transpilation**: Your JSX is transpiled at build time to use `window.PluginRuntime`
2. **Runtime Loading**: Dashboard loads the runtime once globally
3. **Plugin Fetching**: Plugins are fetched as transpiled JavaScript
4. **Secure Rendering**: The runtime validates all elements and props before rendering

## Security Features

- ✅ Whitelist of allowed HTML elements
- ✅ Whitelist of allowed attributes
- ✅ Event handlers wrapped in security layer
- ✅ No direct DOM access
- ✅ Plugins can't access Preact internals
- ✅ Elements marked with security symbol

## Build Output

When you build your plugin, JSX like this:

```jsx
<div className="card">
  <h1>Hello</h1>
</div>
```

Becomes:

```javascript
window.PluginRuntime.jsx('div', {
    className: 'card',
    children: window.PluginRuntime.jsx('h1', {
        children: 'Hello'
    })
})
```

## Development Workflow

1. **Write** your plugin in JSX/TypeScript
2. **Test** locally with the mock SDK
3. **Build** with Vite to create `dist/plugin.js`
4. **Deploy** the built JavaScript file
5. **Load** in dashboard via plugin system

## Future Enhancements

- [ ] WebWorker sandboxing
- [ ] CSP policy integration
- [ ] Plugin permissions system
- [ ] Resource usage limits
- [ ] Async component support