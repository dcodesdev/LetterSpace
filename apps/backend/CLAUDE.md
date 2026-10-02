# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev            # Dev server with watchexec
pnpm start          # Production server (Bun)
pnpm build          # Compile TypeScript
pnpm test           # Run tests (Vitest with .env.test)
pnpm test:watch     # Tests in watch mode
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

Cron jobs run in every environment. There is no `NODE_ENV` gate.

### Authentication

JWT-based auth with password versioning:

- Token in `Authorization: Bearer <token>` header
- `verifyToken()` in `src/utils/auth.ts`
- Password version (`pwdVersion`) forces re-auth on password change

### Webhook Transformer

Custom JavaScript transformers run in QuickJS sandbox (`src/webhook/transformer.ts`). Memory limits configurable via env vars.

### Email Sending

Nodemailer integration in `src/lib/Mailer.ts`. Always opens a real SMTP connection — point dev at a local catcher.

### Testing

Vitest against a real PostgreSQL database. No in-memory substitute, no mocked Prisma.

```bash
pnpm test                            # Whole suite
pnpm test:watch                      # Watch mode
pnpm test:run tests/integration/trpc/list.test.ts   # Single file
pnpm test:run -t "cross-org"         # Single test by name
```

Every script wraps Vitest in `dotenv -e .env.test`. Values already in the
environment win, so CI overrides `DATABASE_URL` and `JWT_SECRET` from the
workflow env.

#### Layout

```
tests/integration/
  helpers/
    setup.ts        - global setup: loads .env.test, migrates, resets the DB per test
    reset-db.ts     - deletes every model children-first
    factories/      - one file per model, barrel-exported
    auth.ts         - createAuthedUser()
    trpc.ts         - createCaller(), createCallerFromToken(), expectTrpcError()
    request.ts      - Supertest client bound to the Express app
    fake-request.ts - minimal express.Request stand-in
    wait-for.ts     - polls an assertion; for endpoints that write after responding
  api/ cron/ trpc/ webhook/   - integration suites
src/**/*.test.ts               - unit tests, colocated
```

Aliases: `@src`, `@tests`, `@helpers`, `@prisma-client`. Use them, not relative paths.

#### DB reset semantics

`setup.ts` runs `resetDb()` in `beforeEach`, truncating every model. Because
one database is shared, `vitest.config.ts` sets `fileParallelism: false` and
`sequence.concurrent: false` — keep both. Tests own their fixtures; nothing
persists between them, including anything the seed script would create.

Add a new model to `prisma/schema.prisma`? Add its `deleteMany()` to
`reset-db.ts` in FK-safe order.

#### Factories

```ts
import { createAuthedUser } from "@helpers/auth"
import { createList, createSubscriber } from "@helpers/factories"

const { user, orgId, token, apiKey } = await createAuthedUser()
const list = await createList({ organizationId: orgId })
await createSubscriber({ organizationId: orgId, listIds: [list.id] })
```

`createUser()` also creates an organization with general, email-delivery and
SMTP settings, plus an API key. Faker fills any field you omit.

`src/utils/prisma.ts` globally omits `apiKey.key` and `user.password` /
`user.pwdVersion`. A factory or query that needs one must opt back in with
`omit: { key: false }`.

#### TRPC callers

```ts
import { createCaller, expectTrpcError } from "@helpers/trpc"

const caller = createCaller({ id: user.id })
await caller.list.create({ organizationId: orgId, name: "News" })

await expectTrpcError(
  createCaller().list.list({ organizationId: orgId }),
  "UNAUTHORIZED"
)
```

`createCaller(user?)` injects the context directly. `createCallerFromToken(token)`
goes through the real `createContext`, so use it to assert on token expiry and
`pwdVersion` invalidation.

See [docs/testing.md](../../docs/testing.md) for the test-database setup and the
CI workflow.
