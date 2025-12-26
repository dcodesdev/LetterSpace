#!/bin/bash

set -e

BUMP_TYPE="${1:-patch}"

if [[ ! "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Error: Invalid bump type. Use: patch, minor, or major"
  exit 1
fi

PACKAGE_JSON="package.json"

if [[ ! -f "$PACKAGE_JSON" ]]; then
  echo "Error: $PACKAGE_JSON not found"
  exit 1
fi

CURRENT_VERSION=$(node -p "require('./$PACKAGE_JSON').version")

IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR="${VERSION_PARTS[0]}"
MINOR="${VERSION_PARTS[1]}"
PATCH="${VERSION_PARTS[2]}"

case "$BUMP_TYPE" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
TAG_NAME="v$NEW_VERSION"

echo "Current version: $CURRENT_VERSION"
echo "New version: $NEW_VERSION"
echo "Tag: $TAG_NAME"
echo ""

read -n 1 -p "Do you want to create a tag for $TAG_NAME? (y/n): " CREATE_TAG
echo ""

if [[ ! "$CREATE_TAG" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$PACKAGE_JSON', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('$PACKAGE_JSON', JSON.stringify(pkg, null, 2) + '\n');
"

git add "$PACKAGE_JSON"
git commit -m "chore: bump version to $NEW_VERSION" || true

git tag "$TAG_NAME"

echo ""
read -n 1 -p "Do you want to push tag to remote? (y/n): " PUSH_TAG
echo ""

if [[ ! "$PUSH_TAG" =~ ^[Yy]$ ]]; then
  echo "Tag created locally. Push manually with: git push origin $TAG_NAME"
  exit 0
fi

git push origin "$TAG_NAME"
echo "Tag $TAG_NAME pushed successfully!"

