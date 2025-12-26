# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev            # Dev server with watchexec
pnpm start          # Production server (Bun)
pnpm build          # Compile TypeScript
pnpm test           # Run tests (Vitest with .env.test)
pnpm lint           # ESLint
pnpm lint:fix       # ESLint with auto-fix
pnpm generate       # Prisma codegen
pnpm migrate:dev    # Create/apply dev migrations
pnpm migrate:deploy # Apply production migrations
```

### Database

```bash
pnpm prisma db seed                    # Seed database
pnpm prisma migrate reset --force      # Reset and reseed
```

## Architecture

Express + TRPC backend with Prisma ORM. Runs on Bun (or Node.js 22+).

### Key Files

- `src/app.ts` - Express app setup, routes, TRPC middleware
- `src/trpc.ts` - TRPC context, auth middleware, procedure definitions
- `src/index.ts` - Server entry point, starts cron jobs
- `src/shared.ts` - Exports for frontend type sharing
- `prisma/schema.prisma` - Database schema

### TRPC Router Pattern

Each domain has its own directory with consistent structure:

```
src/user/
  router.ts    - Router definition combining queries and mutations
  query.ts     - Read procedures (authProcedure or publicProcedure)
  mutation.ts  - Write procedures
```

Available routers: user, organization, list, subscriber, campaign, template, message, settings, webhook, dashboard, stats

### Procedures

- `publicProcedure` - No auth required
- `authProcedure` - Requires valid JWT, provides `ctx.user`

### HTTP Endpoints

- `/trpc/*` - TRPC RPC endpoints
- `/api/*` - REST API (Swagger docs at `/docs`)
- `/t/:id` - Link tracking redirect (updates click stats)
- `/img/:id/img.png` - Email open tracking pixel
- `/webhook/:webhookId` - Webhook handler for external integrations
- `/*` - Serves frontend SPA static files

### Cron Jobs

Defined in `src/cron/`:

- `sendMessages.ts` - Process queued emails
- `processQueuedCampaigns.ts` - Handle scheduled campaigns
- `dailyMaintenance.ts` - Database cleanup
- `cleanupWebhookLogs.ts` - Remove old webhook logs

Cron jobs are disabled when `NODE_ENV=development`.

### Authentication

JWT-based auth with password versioning:

- Token in `Authorization: Bearer <token>` header
- `verifyToken()` in `src/utils/auth.ts`
- Password version (`pwdVersion`) forces re-auth on password change

### Webhook Transformer

Custom JavaScript transformers run in QuickJS sandbox (`src/webhook/transformer.ts`). Memory limits configurable via env vars.

### Email Sending

Nodemailer integration in `src/lib/Mailer.ts`. Returns mock success in development.

### Testing

Vitest with Supertest for API tests. Uses `.env.test` for test database.

```bash
pnpm test                    # Run all tests
pnpm test -- --watch         # Watch mode
pnpm test -- path/to/file    # Single file
```
