# Fix Concerns

## Goal

Fix the entries in the root `CONCERNS.md` that have one obvious fix and need no decision from the maintainer: missing tests, missing guards, wrong error codes, small backend bugs with a single correct answer, and stale doc prose. Each task quotes its concern, names the files and symbols, and says what the fix is. Each task that fixes a concern also deletes that entry from `CONCERNS.md`, or rewrites it to say only what is still open. Entries that need a decision are listed under **Not in scope** and must not be touched.

All backend paths below are relative to `apps/backend/`. Routers live in `src/<domain>/` (`mutation.ts`, `query.ts`, `router.ts`), not in `src/router/`.

## Phases

### Phase 1: Replace real-SMTP tests with mocked-mailer tests

- [x] Concern: *"The doubleOptIn test in `create-subscriber.test.ts` sends a real email through Resend. It is now skipped unless `RESEND_API_KEY`/`RESEND_TEST_EMAIL` are set — so that path is effectively uncovered until it is rewritten against a mocked mailer."* In `tests/integration/api/subscribers/create-subscriber.test.ts`, replace the `it.skipIf(!process.env.RESEND_API_KEY || ...)` test with an always-running test that mocks `nodemailer` the same way `tests/integration/trpc/campaign.test.ts` and `tests/integration/cron/sendMessages.test.ts` do (`vi.mock("nodemailer", ...)`). Use fake SMTP settings (no Resend host, no env vars), assert the response (201, `emailVerified: false`, list attached), the DB row, and that the mocked `sendMail` was called once with the subscriber's email as recipient. Remove every `RESEND_*` reference from the file. Delete the entry from `CONCERNS.md`.
- [x] Concern: *"`settings.testSmtp` opens a real SMTP connection through `Mailer` and is therefore untested; it is the only settings procedure with no coverage."* Add tests for `testSmtp` (`src/settings/mutation.ts`) to `tests/integration/trpc/settings.test.ts`, mocking `nodemailer` as above. Cover: success path, transport failure (mocked `sendMail`/`verify` rejects — assert whatever the procedure currently returns or throws), missing SMTP settings, and a caller who is not a member of the organization. Pin current behaviour; do not change `testSmtp`. Delete the entry from `CONCERNS.md`.

### Phase 2: Webhook hardening

- [x] Concern: *"`src/webhook/authorization.ts` runs user code in QuickJS with no timeout and no interrupt handler at all — the same infinite-loop hang still exists there … Worth fixing the same way."* In `runAuthorization` (`src/webhook/authorization.ts`), add the same deadline mechanism `src/webhook/transformer.ts` uses: a `deadline = Date.now() + TIMEOUT_MS` (5000 ms) checked inside `runtime.setInterruptHandler`, an `isTimedOut` flag, resetting the handler in a `finally`, and disposing the interrupted result handle before returning/throwing (without it `runtime.dispose()` aborts the QuickJS module). A timeout must fail authorization with a non-2xx status and a clear "timed out" error, not hang. Add a test to `tests/integration/webhook/handler.test.ts` with `authCode` containing `while (true) {}` that asserts the request completes with an error status (raise the test's timeout above 5 s). Delete the entry from `CONCERNS.md`.
- [x] Concern: *"The handler logs `Failed to log webhook request: PrismaClientKnownRequestError` when a request hits an unknown webhook id — it tries to write a `WebhookLog` row with an FK to a webhook that does not exist."* In `src/webhook/handler.ts`, skip the `prisma.webhookLog.create` in the logging block when no `Webhook` row exists for the id (track it from the existing `findFirst` lookup, e.g. a `webhookExists` flag; note the lookup filters `isActive: true`, so an inactive-but-existing webhook must still be logged — look it up without the `isActive` filter for this flag, or log only when the row exists). The 404 response is unchanged. Add/adjust a test in `tests/integration/webhook/handler.test.ts` asserting an unknown id returns 404 and writes no `WebhookLog` row, and that an inactive webhook still gets its log row. Delete the entry from `CONCERNS.md`.

### Phase 3: Settings and subscriber import error handling

- [x] Concern: *"`settings.deleteApiKey` with an id belonging to another organization lets a raw Prisma `P2025` escape as a 500 instead of returning `NOT_FOUND`."* In `deleteApiKey` (`src/settings/mutation.ts`), look the key up with `findFirst({ where: { id, organizationId } })` and throw `TRPCError({ code: "NOT_FOUND", message: "API key not found" })` when absent, then delete. Update the test in `tests/integration/trpc/settings.test.ts` that pins the 500 to expect `NOT_FOUND`, and assert the other org's key still exists. Delete the entry from `CONCERNS.md`.
- [x] Concern: *"A CSV with an inconsistent column count still surfaces the raw `csv-parse` error as `INTERNAL_SERVER_ERROR` instead of `BAD_REQUEST`."* In the `import` procedure in `src/subscriber/mutation.ts`, wrap the CSV-parse promise so a parser error is rethrown as `TRPCError({ code: "BAD_REQUEST", message: \`Invalid CSV: ${err.message}\` })`. Update the pinning test in `tests/integration/trpc/subscriber.test.ts`. Delete the entry from `CONCERNS.md`.
- [x] Concern: *"`subscriber.import` upserts rows concurrently via `Promise.all`; a file containing the same email twice can race on the `organizationId_email` unique index. Not covered by tests."* In the same procedure, de-duplicate `subscribers` by email before the transaction (keep the last row for each email, so the result matches sequential upserts). Add a test importing a CSV with the same email on two rows: it succeeds, creates one subscriber, and that subscriber carries the later row's name. Delete the entry from `CONCERNS.md`.

### Phase 4: Campaign mutations

- [x] Concern: *"`campaign.update` rebuilds `CampaignLists` with `deleteMany: {}` on every call, so an update that omits `listIds` silently drops all of the campaign's lists."* In the update mutation in `src/campaign/mutation.ts` (around the `CampaignLists: { deleteMany: {}, create: input.listIds?.map(...) }` block), only include the `CampaignLists` rebuild when `input.listIds !== undefined`; an explicit `[]` still clears the lists. Update the pinning test in `tests/integration/trpc/campaign.test.ts`: omitting `listIds` keeps the lists, `listIds: []` clears them. Delete the entry from `CONCERNS.md`.
- [x] Concern: *"`campaign.start` performs every precondition check … and then only writes `status`; nothing it gathers is used … the whole subscriber/`pMap` block is dead work on every start."* The precondition checks are real validation and stay. Only the subscriber loading is wasted: in the start mutation in `src/campaign/mutation.ts`, drop the `ListSubscribers → Subscriber` include from the campaign query and the `subscribers` `Map`/nested `pMap`, and replace the "at least one recipient" check with a `prisma.listSubscriber.count({ where: { listId: { in: <campaign list ids> }, unsubscribedAt: null } })` (or `findFirst`) — same error code and message ("Campaign must have at least one recipient"). Remove the `pMap` import if it becomes unused. Existing `campaign.start` tests must pass unchanged. Delete the entry from `CONCERNS.md`.

### Phase 5: Stats and dashboard

- [x] Concern: *"`stats.getStats` `campaigns.comparison` and `completedCampaigns.comparison` are `total - lastMonth` … Almost certainly a copy-paste bug."* In `src/stats/query.ts`, change them to `result.totalCampaignsThisMonth - result.totalCampaignsLastMonth` and `result.completedCampaignsThisMonth - result.completedCampaignsLastMonth` (the web shows this value as "vs last month"). Update the pinning tests in `tests/integration/trpc/stats.test.ts`. Delete the entry from `CONCERNS.md`.
- [x] Concern: *"`stats.getStats` `recipients` mixes types: the raw SQL returns `bigint`, but the `|| 0` fallback turns an empty result into the number `0`."* In `src/stats/query.ts`, make `recipients.allTime`, `thisMonth` and `lastMonth` always `number` (`Number(result.recipients[0]?.count ?? 0)` etc.), and make `comparison` use the same `?? 0` so an empty result gives `0`, not `NaN`. The web already wraps the value in `Number(...)` (`apps/web/src/pages/dashboard/messages/page.tsx`). Update tests. Delete the entry from `CONCERNS.md`.
- [x] Concern: *"`dashboard.getStats` builds `subscriberGrowth` by indexing `subscriberGrowthCumulative[i - 1]` with `i` from the source array. Any row skipped for a null date misaligns the running total."* In `src/dashboard/query.ts`, take the previous total from the last element pushed (`subscriberGrowthCumulative.at(-1)?.count ?? baselineSubscriberCount`). Add a unit-level or integration test that exercises a skipped row if it can be produced; otherwise cover the running total across several days. Delete the entry from `CONCERNS.md`.
- [x] Concern: *"`dashboard.getStats` runs a per-campaign `pMap` issuing two extra count queries for each of the five recent campaigns; the same numbers are already available from a single `groupBy`."* In `src/dashboard/query.ts`, replace the `pMap` over `recentCampaigns` with one `prisma.message.groupBy({ by: ["campaignId", "status"], where: { campaignId: { in: ids } }, _count: true })`, then compute `totalMessages`, `sentMessages` (statuses in `messageStatus.deliveredMessages`) and `deliveryRate` per campaign from it. Output shape and values must be identical; existing `tests/integration/trpc/dashboard.test.ts` must pass. Remove the `pMap` import if unused. Delete the entry from `CONCERNS.md`.

### Phase 6: Documentation

- [x] Concern: *"`dailyMaintenance` only nulls `Message.content`; it never deletes rows, yet logs `Deleted N messages`."* In `src/cron/dailyMaintenance.ts`, change the log wording to say content was cleared (e.g. `Cleared content of N messages older than D days`) and rename `totalDeletedMessages` accordingly; update any test asserting the log text and `docs/maintenance.md` if it says messages are deleted. Do **not** change the `?? 30` fallback (that part stays in `CONCERNS.md`, rewritten to cover only the fallback: it applies to orgs with no `GeneralSettings` row and disagrees with the schema default of 90).
- [x] Concern: *"The docs now state 'all 19 models' for `reset-db.ts`. That number is hardcoded prose and will silently go stale."* Remove the count from `docs/testing.md:66` and `apps/backend/CLAUDE.md:129` ("deletes every model children-first" / "truncating every model"). Delete the entry from `CONCERNS.md`.
- [x] Update `docs/webhooks.md` to state that authorization code has the same 5 s timeout as transform code; update `docs/testing.md` / `apps/backend/CLAUDE.md` if they mention the Resend-gated doubleOptIn test or `RESEND_*` variables; update `docs/subscribers.md` if it describes import error handling or duplicate rows.

### Phase 7: Check

- [x] Run `pnpm --filter backend lint`, `pnpm --filter backend check-types` and `pnpm --filter backend test:run` (needs the test DB from `apps/backend/.env.test`), plus `pnpm check-types` at the root to catch web breakage from changed TRPC output types. Fix anything the earlier phases broke.
- [x] Run `pnpm format` on touched files only (do not reformat unrelated files).
- [x] Confirm every concern fixed above is gone from `CONCERNS.md` (or rewritten to what is still open) and that `CONCERNS.md` is still grouped under `## Critical` / `## High` / `## Medium` / `## Low`.

## Constraints

- Do not touch anything listed under **Not in scope**, even if the code is next to a task.
- Never send real email: every test that reaches `Mailer` mocks `nodemailer`.
- Tests run against the real Postgres test DB; follow `docs/testing.md` and the factories in `tests/integration/helpers/factories`.
- Remember `src/utils/prisma.ts` globally omits `apiKey.key` and `user.password`/`user.pwdVersion`; opt back in with `omit: { ...: false }` where a test needs them.
- Match existing patterns: `TRPCError` codes and messages, `authProcedure`, membership check via `prisma.userOrganization.findFirst`.

## Success Criteria

- Every task above is ticked and its concern is removed from (or rewritten in) `CONCERNS.md`.
- Backend lint, type-check and test suite pass with no skipped Resend test.
- No behaviour changed for any entry under Not in scope.

## Not in scope

These need a decision from the maintainer. Leave them in `CONCERNS.md` and do not change the code they describe.

- Tracking links use `/r/:id` but only `/t/:id` exists, and no `?sid=` is appended — route choice, compatibility with already-sent emails, per-subscriber link rendering.
- Scheduled campaigns never leave `SCHEDULED` — fixing it would start sending campaigns that are currently stuck.
- `user.signup` refuses a second account (and its unreachable duplicate-email check) — single-user vs multi-user.
- `settings.createWebhook` / `deleteWebhook` / `listWebhooks` are TODO stubs — implement or remove.
- `authenticateApiKey` ignores `ApiKey.expiresAt` — enforcing it breaks integrations using already-expired keys.
- Transformer's "transform returned undefined" fallback is unreachable — make it reachable or delete it.
- `sendMessages` leaves messages stranded in `PENDING` after a crash — recovery design.
- `FAILED`/`COMPLAINED` messages consume send quota — rate-limit semantics.
- `stats.getStats` rate denominators use `createdAt` while numerators use `sentAt` — changes what the rates mean.
- `subscriber.import` drops phone/company/tags columns — whether to store them in `SubscriberMetadata`.
- `settings.updateSmtp` sentinel upsert and non-unique `SmtpSettings.organizationId` — needs a schema migration.
- Inconsistent `NOT_FOUND` vs `UNAUTHORIZED` for org-membership failures — pick one contract.
- `webhook.logs` returns an empty page for another org's webhook instead of `NOT_FOUND`.
- No REST API rate limiting — new dependency/policy.
- `GET /api/subscribers` has no `perPage` cap — public API contract and limit value.
- `cron.utils.ts` lock has no timeout or reset.
- `processQueuedCampaigns` log-once flags.
- `dailyMaintenance` `?? 30` fallback vs schema default 90.
- `Mailer.sendEmail` mixed throw / `{ success: false }` contract.
- Tracking endpoints respond before their DB write finishes.
- `authenticateApiKey` `lastUsed` update is best-effort.
- CI workflow has never run; `on: push` has no branch filter; `JWT_SECRET` falls back silently; migrations re-run per test file.
- Unit tests load the integration `setup.ts` — split vitest projects.
- Vitest `ENOENT ... library.js.map` warnings.
- `tests/integration/user.test.ts` was red before — check whether anyone relied on CI being green.
- Unexplained commit `d3c5f46` on `chore/adding-tests`.
