# Backend Test Suite

## Goal

The backend has real test infrastructure (Vitest + Supertest + a Postgres test database via `.env.test`) but almost no coverage: only the REST subscriber endpoints, one auth test, one smoke test, and two util unit tests (`placeholder-parser`, `message-id`). Every TRPC router (user, organization, list, subscriber, campaign, template, message, settings, webhook, dashboard, stats), the cron jobs, the webhook transformer sandbox, `Mailer`, `LinkTracker`, and the tracking endpoints in `app.ts` are untested. This plan builds out a real test suite for `apps/backend`: harden the shared test harness (per-test DB reset, factories, a typed TRPC caller), then add unit and integration coverage domain by domain, and wire `test` into Turbo and CI so it runs on every push.

## Phases

### Phase 1: Test harness hardening

- [x] Re-enable DB isolation in `tests/integration/helpers/setup.ts` — call `resetDb()` in `beforeEach` (currently commented out) and extend `reset-db.ts` to cover every model in `prisma/schema.prisma` (webhook, webhook log, tracked link, click, api key, etc.) in FK-safe order
- [x] Add `test` and `test:run` scripts to `apps/backend/package.json` (`vitest` / `vitest run`) and a non-cached `test` task to `turbo.json` depending on `generate`
- [x] Add a `tests/integration/helpers/factories/` module with factories for org, list, subscriber, campaign, template, message, webhook, api key — move `helpers/user/user.ts` and `helpers/list/list.ts` behind it and update the existing subscriber tests to import from it
- [x] Add `helpers/auth.ts` exposing `createAuthedUser()` returning `{ user, orgId, token, apiKey }` using `generateToken()`
- [x] Add `helpers/trpc.ts` exposing `createCaller(user?)` that builds an `appRouter` caller with a fake context (export `appRouter` from `src/app.ts` so tests can import it)
- [x] Verify the whole existing suite still passes with the reset enabled: `pnpm --filter backend test:run`

### Phase 2: Unit tests for utils and lib

- [x] `src/utils/auth.test.ts` — `hashPassword`/`comparePasswords` round-trip and rejection, `generateToken`/`verifyToken` payload shape, expired and tampered tokens
- [x] `src/utils/token.test.ts` — `tokenPayloadSchema` accepts a real generated payload and rejects missing/misfyped fields
- [x] `src/utils/message-status.test.ts` — status group membership and that groups stay in sync with the Prisma `MessageStatus` enum
- [x] `src/utils/pProps.test.ts` — `resolveProps` resolves keys, preserves types, and propagates rejection
- [x] `src/cron/cron.utils.test.ts` — `cronJob` skips a concurrent run, releases the lock after success and after a throw, and swallows errors

### Phase 3: Mailer and LinkTracker

- [x] `src/lib/Mailer.test.ts` — mock `nodemailer` with `vi.mock`; assert transport config from SMTP settings, mock success path in `NODE_ENV=development`, and error handling on send failure
- [x] `src/lib/LinkTracker.test.ts` (integration, real DB) — `@TRACK` suffix rewriting, `getOrCreateTrackLink` upsert idempotency, links unmarked with the suffix left untouched
- [x] Cover the tracking endpoints in `app.ts`: `GET /t/:id` redirects and records a click, unknown id behaviour; `GET /img/:id/img.png` returns a PNG and marks the message opened, and stays 200 for an unknown id

### Phase 4: Webhook subsystem

- [x] `src/webhook/transformer.test.ts` — QuickJS sandbox: successful transform, syntax error, thrown error, infinite loop hitting the timeout, memory limit, and no access to host globals
- [x] `src/webhook/authorization.test.ts` — each supported auth scheme accepts a valid request and rejects a missing/wrong credential
- [x] `src/webhook/processor.test.ts` — payload processing happy path and malformed payload
- [x] `tests/integration/webhook/handler.test.ts` — `POST /webhook/:webhookId` for unknown id, unauthorized, disabled webhook, and a successful run that writes a webhook log

### Phase 5.a: TRPC — user, organization, settings

- [x] `tests/integration/trpc/user.test.ts` — register, login with right/wrong password, `me`, update profile, change password bumps `pwdVersion` and invalidates the old token
- [x] `tests/integration/trpc/organization.test.ts` — create/read/update, and that a user cannot read another org
- [x] `tests/integration/trpc/settings.test.ts` — SMTP, general, and email-delivery settings read/update plus validation errors
- [x] Assert `UNAUTHORIZED` from `authProcedure` for each router when called with no user

### Phase 5.b: TRPC — list, subscriber

- [x] `tests/integration/trpc/list.test.ts` — create, list with pagination/search, update, delete, subscriber counts
- [x] `tests/integration/trpc/subscriber.test.ts` — create, duplicate email in the same org, update, delete, list membership changes, unsubscribe
- [x] CSV import path in `subscriber/mutation.ts` — valid file, malformed rows, duplicate handling
- [x] Cross-org isolation: a subscriber or list from another org is not readable or mutable

### Phase 5.c: TRPC — campaign, template, message

- [x] `tests/integration/trpc/campaign.test.ts` — create draft, schedule, send, cancel, and status transitions rejected out of order
- [x] `tests/integration/trpc/template.test.ts` — CRUD plus placeholder validation
- [x] `tests/integration/trpc/message.test.ts` — query filtering by status/campaign and pagination
- [x] Cross-org isolation for all three routers

### Phase 5.d: TRPC — dashboard, stats, webhook router

- [x] `tests/integration/trpc/dashboard.test.ts` — counts and recent activity against a seeded fixture
- [x] `tests/integration/trpc/stats.test.ts` — open/click/delivery rates over a seeded message set, including the empty-data case (no division by zero)
- [x] `tests/integration/trpc/webhook.test.ts` — webhook CRUD, transformer validation, log querying

### Phase 6: Cron jobs

- [x] `tests/integration/cron/sendMessages.test.ts` — picks up queued messages, respects the org rate limit, marks sent/failed, and is a no-op with an empty queue
- [x] `tests/integration/cron/processQueuedCampaigns.test.ts` — a scheduled campaign whose time has come creates messages for every list subscriber; a future one is skipped; a run is idempotent
- [x] `tests/integration/cron/dailyMaintenance.test.ts` and `cleanupWebhookLogs.test.ts` — old records deleted, recent records kept

### Phase 7: REST API and middleware

- [x] `tests/integration/api/middleware.test.ts` — `authenticateApiKey`: missing key, invalid key, valid key attaches the org and updates `lastUsed`
- [x] Extend the subscriber REST tests with validation errors (bad email, unknown list id), cross-org access attempts, and pagination/filter query params on `GET /api/subscribers`
- [x] Add a smoke test asserting `/docs` and the Swagger spec serve successfully

### Phase 8: CI

- [x] Add `.github/workflows/test.yaml` running on push and pull request: pnpm + Node 22, a `postgres:16` service container, `prisma migrate deploy`, then `pnpm --filter backend test:run`
- [x] Ensure `.env.test` values used in CI come from the workflow env, not the committed file

### Phase 9: Documentation

- [x] Update `apps/backend/CLAUDE.md` — the Testing section: harness layout, factories, `createCaller`, DB reset semantics, how to run a single file
- [x] Update root `CLAUDE.md` and `README.md` with `pnpm test` (Turbo) and the test-database setup steps
- [x] Create `./docs/testing.md` covering the test database, `.env.test`, writing a new integration test with the factories, and the CI workflow

## Constraints

- Tests run against a real Postgres database (`DATABASE_URL` in `apps/backend/.env.test`); no in-memory substitute
- `vitest.config.ts` runs suites non-concurrently — keep it that way, since tests share one database
- Aliases `@src`, `@tests`, `@helpers` already exist; use them instead of relative paths
- Follow existing style: `describe`/`it` from `vitest`, Supertest for HTTP, `@faker-js/faker` for fixture data, minimal comments
- Email sending is mocked in `NODE_ENV=development`; do not send real mail from tests
- Do not change production behaviour to make tests pass — if a test finds a bug, note it in `PROGRESS.md` and fix it deliberately

## Success Criteria

- `pnpm --filter backend test:run` passes from a clean database, and passes twice in a row (no state leakage)
- Every TRPC router, cron job, REST endpoint, and `src/lib` module has at least one integration test, and auth/isolation is asserted per router
- `pnpm test` at the repo root runs the backend suite through Turbo
- CI runs the suite on every push and pull request
- Testing docs exist at `./docs/testing.md` and the CLAUDE.md files match reality
