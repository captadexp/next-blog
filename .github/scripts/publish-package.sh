#!/bin/bash

set -e

PACKAGE_DIR=$1
RELEASE_TYPE=$2

if [ -z "$PACKAGE_DIR" ] || [ -z "$RELEASE_TYPE" ]; then
  echo "Usage: $0 <package_dir> <release_type>"
  echo "Example: $0 packages/core latest"
  exit 1
fi

cd "$PACKAGE_DIR"

if [ "$RELEASE_TYPE" = "latest" ]; then
  echo "Publishing latest version of $(basename $PACKAGE_DIR)..."
  bun pm version patch --no-git-tag-version
  bun publish --access public
elif [ "$RELEASE_TYPE" = "beta" ]; then
  echo "Publishing beta version of $(basename $PACKAGE_DIR)..."
  bun pm version prerelease --preid=beta --no-git-tag-version
  bun publish --tag beta --access public
else
  echo "Publishing canary version of $(basename $PACKAGE_DIR)..."
  COMMIT_SHA=$(git rev-parse --short HEAD)
  CURRENT_VERSION=$(bun -e "console.log(require('./package.json').version)")
  BASE_VERSION=${CURRENT_VERSION%-canary.*}
  NEW_VERSION="${BASE_VERSION}-canary.${COMMIT_SHA}"
  bun pm pkg set version="${NEW_VERSION}"
  bun publish --tag canary --access public
fi

echo "Successfully published $(basename $PACKAGE_DIR)"

# Update workspace dependencies to use the new version
echo "Updating workspace dependencies..."
cd - > /dev/null
bun install