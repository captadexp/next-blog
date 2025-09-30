# Plugin Developer Workflow Test

## 1. Developer installs only plugin-dev-kit

```bash
npm install --save-dev @supergrowthai/plugin-dev-kit vite typescript
```

## 2. Developer writes plugin with JSX

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
                    <button onClick={() => sdk.notify('Clicked!')}>
                        Click Me
                    </button>
                </div>
            );
        }
    }
};

export default MyPlugin;
```

## 3. Developer builds plugin

```bash
vite build
```

## 4. Output is a single IIFE

- File: `dist/plugin.js`
- Format: IIFE that returns plugin object
- References: `window.PluginRuntime` (not bundled)

## 5. Dashboard loads plugin

1. Runtime loaded once: `<script src="plugin-runtime.js">`
2. Plugin fetched and eval'd
3. Plugin returns object with hooks
4. Hooks return JSX elements
5. PluginSlot renders them securely

## Key Benefits

✅ Developer only needs `@supergrowthai/plugin-dev-kit`
✅ Full TypeScript support
✅ JSX syntax works
✅ No runtime bundled in plugins
✅ Clean, minimal output