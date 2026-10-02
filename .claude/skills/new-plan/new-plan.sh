#!/usr/bin/env bash
# Scaffold a plan directory: ./plans/YYYY-MM-DD-HHMM-<name>/
# Usage: bash .claude/skills/new-plan/new-plan.sh <kebab-case-name>
# Prints the created directory path on stdout.
set -euo pipefail

name="${1:-}"
if [ -z "$name" ]; then
  echo "usage: new-plan.sh <kebab-case-name>" >&2
  exit 1
fi

dir="./plans/$(date +%Y-%m-%d-%H%M)-${name}"
if [ -e "$dir" ]; then
  echo "already exists: $dir" >&2
  exit 1
fi
mkdir -p "$dir"

echo "$dir"
