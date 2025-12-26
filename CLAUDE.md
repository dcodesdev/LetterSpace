# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LetterSpace is an open source, self-hosted newsletter platform. It's a pnpm monorepo with Turbo for task orchestration.

## Commands

### Development

```bash
pnpm dev                    # Run all dev servers (Turbo)
pnpm build                  # Build all projects
pnpm lint                   # Lint all projects
pnpm format                 # Format with Prettier
```

### Backend-specific

```bash
pnpm --filter backend dev           # Run backend only
pnpm --filter backend test          # Run tests (Vitest)
pnpm --filter backend generate      # Prisma codegen
pnpm --filter backend migrate:dev   # Dev migrations
```

### Database

```bash
pnpm --filter backend prisma db seed              # Seed database
cd apps/backend && pnpm prisma migrate reset --force  # Reset and reseed
```

### Release Process

```bash
./scripts/release.sh          # Bumps patch version (default)
./scripts/release.sh minor    # Bumps minor version
./scripts/release.sh major    # Bumps major version
```

The script bumps version in `package.json`, creates a git tag, and pushes it. GitHub Actions builds Docker images and creates a release from `RELEASE_NOTES.md`.

## Architecture

### Monorepo Structure

- `apps/backend` - Express + TRPC backend (Bun/Node.js)
- `apps/web` - Vite + React dashboard (PWA)
- `apps/landing-page` - Next.js marketing site
- `apps/docs` - Nextra documentation
- `packages/ui` - Shared Shadcn UI components
- `packages/shared` - Shared TypeScript types
- `packages/eslint-config` - Shared ESLint config

### Backend Architecture

TRPC routers in `apps/backend/src/router/`:

- Each domain (user, campaign, subscriber, etc.) has its own directory
- Pattern: `router.ts` (definition), `mutation.ts` (writes), `query.ts` (reads)

Key entry points:

- `apps/backend/src/app.ts` - Express app setup, middleware, routes
- `apps/backend/src/trpc.ts` - TRPC context and auth
- `apps/backend/src/cron/` - Scheduled jobs (email sending, maintenance)

Endpoints:

- `/trpc/*` - TRPC RPC endpoints
- `/api/*` - REST API (Swagger documented)
- `/t/:id` - Link tracking redirect
- `/img/:id/img.png` - Email open tracking pixel

### Frontend Architecture

React Router app in `apps/web/src/`:

- `app.tsx` - Route definitions
- `pages/` - Page components matching routes
- TRPC client with React Query for data fetching
- Token auth via cookies

### Database

Prisma ORM with PostgreSQL. Schema at `apps/backend/prisma/schema.prisma`.

Key models: User, Organization (multi-tenancy), Subscriber, List, Campaign, Template, Webhook.

## Tech Stack

- **Backend**: Express, TRPC, Prisma, PostgreSQL, Bun/Node.js 22+
- **Frontend**: React 19, Vite, React Router, Shadcn UI, TailwindCSS
- **Shared**: TypeScript (strict), Zod, React Hook Form

## Code Style

- Adhere to existing code patterns in the codebase
- Minimal comments
- Component files: kebab-case (e.g., `user-profile.tsx`)
- Component exports: PascalCase (e.g., `export const UserProfile`)
- Colocate types/data with components when only used by that component

## Development Notes

- Email sending is disabled in development (`NODE_ENV=development`) - cron jobs skip and mailer returns mock responses
- Backend tests use `.env.test` for configuration
- Webhook transformers run in QuickJS sandbox with configurable memory limits
