#!/bin/sh
set -e

pnpm exec prisma migrate deploy
pnpm exec prisma generate

if [ "$1" = "--bun" ]; then
  exec bun run src/index.ts
else
  exec node dist/index.js
fi
