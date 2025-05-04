#!/bin/sh

pnpm exec prisma migrate deploy
pnpm exec prisma generate

bun run src/index.ts