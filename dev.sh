#!/bin/bash

# Make the script exit if any command fails
set -e

# Change to the project directory (adjust if needed)
cd "$(dirname "$0")"

# Start both processes in parallel
echo "Starting development environment..."
echo "Core package in watch mode (terminal 1)"
echo "Test app (terminal 2)"

# This requires the 'concurrently' package, which we'll install if not present
if ! command -v concurrently &> /dev/null; then
  echo "Installing concurrently..."
  npm install -g concurrently
fi

# Run both processes
concurrently \
  --names "CORE,TEST" \
  --prefix-colors "blue,green" \
  --kill-others \
  "npm run dev" \
  "npm run dev:test"