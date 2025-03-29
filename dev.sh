#!/bin/bash

# Make the script exit if any command fails
set -e

# Change to the project directory
cd "$(dirname "$0")"

# Clean build directories first 
echo "🧹 Cleaning build directories..."
npm run -w packages/core clean
echo "✅ Build directories prepared!"

# Start development processes in parallel
echo "🚀 Starting development environment..."
echo "📦 Core package (server) in watch mode"
echo "🖥️  Core package (client) in watch mode"
echo "🌐 Test app running on http://localhost:3248"

# Check for concurrently and install if needed
if ! command -v concurrently &> /dev/null; then
  echo "📥 Installing concurrently..."
  npm install -g concurrently
fi

# Run all processes
concurrently \
  --names "SERVER,CLIENT,TEST" \
  --prefix-colors "blue,magenta,green" \
  --kill-others \
  "npm run -w packages/core dev:server" \
  "npm run -w packages/core dev:client" \
  "npm run -w packages/test-app dev"