#!/bin/sh

pnpm exec prisma migrate deploy
pnpm exec prisma generate

if [ "$1" = "--bun" ]; then
  bun run src/index.ts
else
  node dist/index.js
fi