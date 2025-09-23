#!/bin/bash

# Build plugins and prepare them for deployment
echo "🚀 Building plugins for deployment..."

# Check if PLUGIN_HOST_URL is set
if [ -z "$PLUGIN_HOST_URL" ]; then
    echo "❌ Error: PLUGIN_HOST_URL environment variable is not set"
    echo "Please set PLUGIN_HOST_URL to your deployment URL, e.g.:"
    echo "  export PLUGIN_HOST_URL=\"https://next-blog.vercel.app\""
    exit 1
fi

echo "📍 Using host URL: $PLUGIN_HOST_URL"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLUGINS_DIR="$ROOT_DIR/plugins"
PUBLIC_PLUGINS_DIR="$SCRIPT_DIR/public/plugins"

# Clean and create public/plugins directory
rm -rf "$PUBLIC_PLUGINS_DIR"
mkdir -p "$PUBLIC_PLUGINS_DIR"

# Initialize manifest array
MANIFEST="{"
MANIFEST="$MANIFEST\"generated\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\","
MANIFEST="$MANIFEST\"plugins\": ["

FIRST_PLUGIN=true

# Build each plugin
for plugin_dir in "$PLUGINS_DIR"/*; do
    if [ -d "$plugin_dir" ]; then
        plugin_name=$(basename "$plugin_dir")
        
        echo "📦 Building plugin: $plugin_name"
        
        # Build the plugin
        cd "$plugin_dir"
        if [ -f "package.json" ]; then
            # Extract version from package.json
            version=$(node -p "require('./package.json').version" 2>/dev/null || echo "1.0.0")
            
            # Set PLUGIN_BASE_URL for the build
            export PLUGIN_BASE_URL="${PLUGIN_HOST_URL}/plugins/$plugin_name/$version"
            
            bun run build
            
            # Check if build was successful
            if [ -d "dist" ]; then
                # Read plugin metadata from dist/plugin.js if it exists
                if [ -f "dist/plugin.js" ]; then
                    
                    # Create versioned directory structure
                    target_dir="$PUBLIC_PLUGINS_DIR/$plugin_name/$version"
                    mkdir -p "$target_dir"
                    
                    # Copy built files
                    cp -r dist/* "$target_dir/"
                    
                    echo "✅ Plugin $plugin_name v$version copied to public/plugins/"
                    
                    # Add to manifest
                    if [ "$FIRST_PLUGIN" = false ]; then
                        MANIFEST="$MANIFEST,"
                    fi
                    FIRST_PLUGIN=false
                    
                    # Extract plugin info from the built plugin.js
                    # Execute the plugin.js to get the actual manifest with URLs
                    plugin_metadata=$(node -e "
                        try {
                            const fs = require('fs');
                            const content = fs.readFileSync('$target_dir/plugin.js', 'utf8');
                            // Execute the IIFE to get the returned object
                            const plugin = eval(content);
                            console.log(JSON.stringify({
                                name: plugin.name || '$plugin_name',
                                author: plugin.author || 'Unknown',
                                description: plugin.description || '',
                                client: plugin.client,
                                server: plugin.server
                            }));
                        } catch(e) {
                            console.log(JSON.stringify({
                                name: '$plugin_name',
                                author: 'Unknown',
                                description: ''
                            }));
                        }
                    " 2>/dev/null || echo '{"name":"'$plugin_name'","author":"Unknown","description":""}')
                    
                    plugin_name_display=$(echo "$plugin_metadata" | node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).name")
                    plugin_author=$(echo "$plugin_metadata" | node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).author")
                    plugin_description=$(echo "$plugin_metadata" | node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).description")
                    
                    MANIFEST="$MANIFEST{"
                    MANIFEST="$MANIFEST\"id\": \"$plugin_name\","
                    MANIFEST="$MANIFEST\"name\": \"$plugin_name_display\","
                    MANIFEST="$MANIFEST\"version\": \"$version\","
                    MANIFEST="$MANIFEST\"author\": \"$plugin_author\","
                    if [ -n "$plugin_description" ]; then
                        MANIFEST="$MANIFEST\"description\": \"$plugin_description\","
                    fi
                    MANIFEST="$MANIFEST\"path\": \"/plugins/$plugin_name/$version\","
                    MANIFEST="$MANIFEST\"files\": {"
                    
                    # Check which files exist
                    FILES_ARRAY=""
                    if [ -f "$target_dir/client.js" ]; then
                        FILES_ARRAY="$FILES_ARRAY\"client\": \"/plugins/$plugin_name/$version/client.js\","
                    fi
                    if [ -f "$target_dir/server.js" ]; then
                        FILES_ARRAY="$FILES_ARRAY\"server\": \"/plugins/$plugin_name/$version/server.js\","
                    fi
                    if [ -f "$target_dir/plugin.js" ]; then
                        FILES_ARRAY="$FILES_ARRAY\"plugin\": \"/plugins/$plugin_name/$version/plugin.js\","
                    fi
                    
                    # Remove trailing comma
                    FILES_ARRAY="${FILES_ARRAY%,}"
                    MANIFEST="$MANIFEST$FILES_ARRAY"
                    MANIFEST="$MANIFEST}"
                    MANIFEST="$MANIFEST}"
                else
                    echo "⚠️  No plugin.js found for $plugin_name, skipping..."
                fi
            else
                echo "⚠️  Build failed for $plugin_name (no dist folder found)"
            fi
        else
            echo "⚠️  No package.json found for $plugin_name, skipping..."
        fi
    fi
done

# Close manifest
MANIFEST="$MANIFEST]}"

# Write manifest to file
echo "$MANIFEST" | node -p "JSON.stringify(JSON.parse(require('fs').readFileSync(0, 'utf8')), null, 2)" > "$PUBLIC_PLUGINS_DIR/available.json"

echo "✨ Plugins build complete!"
echo "📄 Manifest generated at public/plugins/available.json"