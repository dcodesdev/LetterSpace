#!/bin/bash

set -euo pipefail

BUMP_TYPE="patch"
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    patch|minor|major) BUMP_TYPE="$arg" ;;
    --dry-run) DRY_RUN=true ;;
    *) echo "Usage: $0 [patch|minor|major] [--dry-run]"; exit 1 ;;
  esac
done

cd "$(git rev-parse --show-toplevel)"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree is not clean. Commit or stash your changes first."
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
CURRENT_VERSION=$(node -p "require('./package.json').version")

IFS='.' read -r MAJOR MINOR PATCH <<< "${CURRENT_VERSION%%-*}"

case "$BUMP_TYPE" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
TAG_NAME="v$NEW_VERSION"

if git rev-parse -q --verify "refs/tags/$TAG_NAME" > /dev/null; then
  echo "Error: tag $TAG_NAME already exists"
  exit 1
fi

ask() {
  local reply
  read -r -s -n 1 -p "$1 (y/n) " reply
  echo "$reply"
  [[ "$reply" =~ ^[Yy]$ ]]
}

echo "Dry run:"
echo "  Branch:   $BRANCH"
echo "  Version:  $CURRENT_VERSION -> $NEW_VERSION ($BUMP_TYPE)"
echo "  Commit:   chore: release $TAG_NAME"
echo "  Tag:      $TAG_NAME"
echo "  Push:     origin/$BRANCH + $TAG_NAME"
echo ""

if [[ "$DRY_RUN" == true ]]; then
  echo "Dry run only, nothing changed."
  exit 0
fi

if ! ask "Bump to $NEW_VERSION, commit and create tag $TAG_NAME?"; then
  echo "Aborted, nothing changed."
  exit 0
fi

node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\\n');
"

git add package.json
git commit -q -m "chore: release $TAG_NAME"
git tag -a "$TAG_NAME" -m "$TAG_NAME"
echo "Created commit and tag $TAG_NAME."
echo ""

if ! ask "Push $BRANCH and $TAG_NAME to origin?"; then
  echo "Not pushed. Push later with:"
  echo "  git push origin $BRANCH && git push origin $TAG_NAME"
  exit 0
fi

git push origin "$BRANCH"
git push origin "$TAG_NAME"

echo ""
echo "Pushed $TAG_NAME. GitHub Actions will build the Docker images and create the release."
