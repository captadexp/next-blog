#!/bin/bash

# Make the script exit if any command fails
set -e

# Change to the project directory
cd "$(dirname "$0")"

# Clean build directories first 
echo "🧹 Cleaning build directories..."
cd packages/ui && npm run clean
cd ../dashboard && npm run clean
cd ../core && npm run clean
cd ../..
echo "✅ Build directories prepared!"

# Start development processes in parallel
echo "🚀 Starting development environment..."
echo "🎨 UI package in watch mode"
echo "🖥️  Dashboard package in watch mode"
echo "📦 Core package in watch mode"
echo "🌐 Test app running on http://localhost:3248"

# Check for concurrently and install if needed
if ! command -v concurrently &> /dev/null; then
  echo "📥 Installing concurrently..."
  npm install -g concurrently
fi

# Run all processes
concurrently \
  --names "UI,DASHBOARD,CORE,TEST" \
  --prefix-colors "cyan,magenta,blue,green" \
  --kill-others \
  "cd packages/ui && sleep 2 && npm run dev" \
  "cd packages/dashboard && sleep 4 && npm run dev" \
  "cd packages/core && sleep 6 && npm run dev" \
  "cd packages/test-app && sleep 8 && npm run dev"