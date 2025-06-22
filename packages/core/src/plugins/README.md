# Plugin Hooks Documentation

This document describes the available hooks that plugins can use to extend the functionality of the Next Blog platform.

## Plugin Types

Plugins can be of the following types:

- **External**: Plugins hosted on external servers, accessed via URL
- **Lite**: Lightweight plugins that are stored locally
- **Browser**: Client-side plugins that run in the browser

## Available Hooks

Hooks are specific points in the application where plugins can inject or modify functionality. Below is a comprehensive list of available hooks:

### Content Hooks

These hooks allow plugins to modify or enhance content:

- `pre-render-blog`: Called before a blog post is rendered
- `post-render-blog`: Called after a blog post is rendered
- `pre-save-blog`: Called before a blog post is saved
- `post-save-blog`: Called after a blog post is saved
- `pre-delete-blog`: Called before a blog post is deleted
- `post-delete-blog`: Called after a blog post is deleted

### User Hooks

These hooks allow plugins to interact with user-related operations:

- `pre-login`: Called before a user logs in
- `post-login`: Called after a user logs in
- `pre-logout`: Called before a user logs out
- `post-logout`: Called after a user logs out
- `pre-register`: Called before a user is registered
- `post-register`: Called after a user is registered
- `pre-update-user`: Called before a user is updated
- `post-update-user`: Called after a user is updated

### UI Hooks

These hooks allow plugins to modify the user interface:

- `dashboard-header`: Allows adding content to the dashboard header
- `dashboard-footer`: Allows adding content to the dashboard footer
- `blog-editor-toolbar`: Allows adding buttons to the blog editor toolbar
- `blog-sidebar`: Allows adding widgets to the blog sidebar
- `settings-page`: Allows adding sections to the settings page

### System Hooks

These hooks allow plugins to interact with system-level operations:

- `startup`: Called when the application starts
- `shutdown`: Called when the application shuts down
- `pre-request`: Called before processing an HTTP request
- `post-request`: Called after processing an HTTP request
- `error-handler`: Called when an error occurs

### Media Hooks

These hooks allow plugins to interact with media-related operations:

- `pre-upload`: Called before a file is uploaded
- `post-upload`: Called after a file is uploaded
- `pre-delete-media`: Called before a media file is deleted
- `post-delete-media`: Called after a media file is deleted

### SEO Hooks

These hooks allow plugins to modify SEO-related elements:

- `generate-meta-tags`: Called when generating meta tags for a page
- `generate-sitemap`: Called when generating the sitemap
- `generate-robots`: Called when generating the robots.txt file

### Analytics Hooks

These hooks allow plugins to interact with analytics-related operations:

- `page-view`: Called when a page is viewed
- `track-event`: Called when an event is tracked

## Using Hooks in Plugins

To use a hook in a plugin, you need to register it using the plugin hook mapping. Each mapping specifies:

1. The plugin ID
2. The hook name (from the list above)
3. A priority value (lower numbers execute first)

Example of registering a hook:

```javascript
// In your plugin code
function myPluginFunction(context) {
  // Your hook implementation
  context.content = context.content.replace('foo', 'bar');
  return context;
}

// The hook will be registered through the admin interface
// by creating a plugin hook mapping with:
// - pluginId: your-plugin-id
// - hookName: pre-render-blog
// - priority: 10
```

## Best Practices

1. **Performance**: Keep your hook implementations efficient to avoid slowing down the application
2. **Error Handling**: Always include proper error handling in your hook implementations
3. **Compatibility**: Test your plugins with different versions of the platform
4. **Documentation**: Document what your plugin does and which hooks it uses
5. **Cleanup**: If your plugin adds event listeners or modifies the DOM, make sure to clean up when the plugin is deactivated