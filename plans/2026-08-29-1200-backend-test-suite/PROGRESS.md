# Progress

## Completed Phases

### Phase 1: Test harness hardening (2026-08-29)

- `tests/integration/helpers/reset-db.ts` now deletes all 19 models children-first (added click, tracked link, webhook, webhook log, subscriber metadata, campaign list, list subscriber); `setup.ts` calls `resetDb()` in `beforeEach`.
- `vitest.config.ts`: added `fileParallelism: false`. Enabling the per-test reset exposed that test *files* still ran in parallel workers against the one shared DB, so one file's reset wiped another file's fixtures mid-test (FK violations). Sequential files are required, not just sequential tests.
- Added `@prisma-client` alias (tsconfig paths + vitest resolve) pointing at `prisma/client`, so factories can import the generated enums without deep relative paths.
- `tests/integration/helpers/factories/` with `organization`, `user`, `api-key`, `list`, `subscriber`, `template`, `campaign`, `message`, `webhook` + a barrel `index.ts`. Old `helpers/user/` and `helpers/list/` deleted; the five subscriber REST tests import from `@helpers/factories`.
  - Gotcha: `src/utils/prisma.ts` sets a global `omit` for `apiKey.key` and `user.password` / `user.pwdVersion`. Factories that need those must pass `omit: { key: false }` / `omit: { pwdVersion: false }`.
- `helpers/auth.ts` → `createAuthedUser()` returning `{ user, orgId, apiKey, token }`.
- `helpers/trpc.ts` → `createCaller(user?)`; `appRouter` is now exported from `src/app.ts`.
- Scripts: backend `test` = `vitest run`, `test:run` = `vitest run`, `test:watch` = `vitest`. Non-cached `test` task in `turbo.json` depending on `generate`, and `"test": "turbo test"` at the repo root.

### Phase 2: Unit tests for utils and lib (2026-08-29)

Five new unit-test files, 39 tests, all passing; full suite is 96 passed / 1 skipped.

- `src/utils/auth.test.ts` — bcrypt round-trip, wrong password, salt uniqueness, non-bcrypt hash; JWT payload shape, the 30-day `exp - iat` window, expired token, wrong secret, tampered payload, malformed token. Expiry is exercised by signing directly with `jwt.sign(..., { expiresIn: "-1s" })` since `generateToken` hardcodes 30d.
- `src/utils/token.test.ts` — parses a real decoded `generateToken` payload, strips unknown keys, and rejects each missing field (`it.each`), a string `version`, a numeric `id`, and non-object input.
- `src/utils/message-status.test.ts` — every listed status exists in the Prisma enum (imported via `@prisma-client`), no duplicates within a group, `pending ∪ completed` covers the whole enum and the two are disjoint, and the subset chain `opened ⊆ delivered ⊆ processed ⊆ completed`.
- `src/utils/pProps.test.ts` — resolves all keys, preserves types, empty object, runs concurrently (both promises start before either settles), and propagates a rejection.
- `src/cron/cron.utils.test.ts` — a deferred-promise gate proves a second call is skipped while the first is in flight; lock released after success, after a rejection, and after a synchronous throw; the error is logged as `"Cron Error:", "[name]", error` and swallowed; the lock is per-name, not global.

### Phase 3: Mailer and LinkTracker (2026-08-29)

Three new test files, 35 tests. Full suite: 131 passed / 1 skipped across 17 files, green twice in a row.

- `src/lib/Mailer.test.ts` — unit, `nodemailer` mocked. `vi.mock` needs `vi.hoisted()` here: the factory is hoisted above the module-level mock fns, so referencing them directly throws "Cannot access before initialization". Covers transport options (host/auth/`connectionTimeout`), each encryption branch with its default port fallback (STARTTLS 587, SSL_TLS 465, NONE 25 + `ignoreTLS`), accepted/rejected/neither response shapes, `stripAngleBrackets` on the message id, `null` html/text becoming `undefined`, and a rejected `sendMail` propagating.
- `src/lib/LinkTracker.test.ts` — integration against the real DB. `@TRACK` suffix stripped from the stored url, unmarked links untouched, upsert idempotency, per-campaign uniqueness, `http` as well as `https`, content rewritten to `${baseURL}/r/${id}`, and the tracker working through a `$transaction` client.
- `tests/integration/tracking.test.ts` — `GET /t/:id` (redirect, click recorded only with `?sid=`, message marked `CLICKED`, an already-`CLICKED` message left untouched, 404 on unknown/malformed id) and `GET /img/:id/img.png` (1x1 PNG + no-cache headers, `SENT`/`AWAITING_WEBHOOK` → `OPENED`, `QUEUED` untouched, `openTracking: false` untouched, 200 on unknown/malformed id).
- New `tests/integration/helpers/wait-for.ts` — both tracking endpoints send the response *before* their DB write, so assertions have to poll. Without it the writes also leak past the test boundary and hit the next test's reset database; the pixel-headers test drains its own write for that reason.

Also fixed a pre-existing `tsc` error in `src/utils/pProps.test.ts` (`result.rows[0].id` under `noUncheckedIndexedAccess`). `npx tsc --noEmit` is now clean.

Production bugs found, not fixed (see CONCERNS.md):

1. `LinkTracker` emits `/r/:id` tracking urls but `app.ts` only routes `/t/:id` — no `/r/` handler exists anywhere, so every tracked link in a sent campaign 404s into the SPA catch-all.
2. `/t/:id` attributes a click only when `?sid=` is present, and `LinkTracker` never appends one.
3. `Mailer` has no `NODE_ENV=development` mock path despite the SPEC item and root CLAUDE.md claiming one; there is no `NODE_ENV` check in `src/` at all. Tested the real behaviour instead.

### Phase 4: Webhook subsystem (2026-08-29)

Four test files, 57 tests. Full suite: 188 passed / 1 skipped across 21 files, green twice in a row, `tsc --noEmit` clean.

- `src/webhook/transformer.test.ts` — no-transform-code validation (valid payload, `error` field kept, missing `messageId` → 400); with transform code: custom shape mapping, headers/query arguments, syntax error, thrown error, invalid transform result, the 5s timeout on `while (true)`, the memory limit on runaway string growth, and `process`/`require`/`fetch`/`setTimeout` all `undefined` inside the sandbox.
- `src/webhook/authorization.test.ts` — `runAuthorization` return values (true / false / falsy non-boolean / syntax error / throw / `authorize` undefined) plus one describe per scheme: bearer header, shared secret in the body, api key in the query string, route params, and host-global isolation.
- `src/webhook/processor.test.ts` — status update per event type (`it.each`), case-insensitive matching, default vs payload-supplied bounce error, unknown event → 400, no matching message → 404, and cross-organization isolation.
- `tests/integration/webhook/handler.test.ts` — `POST /webhook/:webhookId` for unknown id, inactive webhook, valid event, missing `messageId`, authorization reject/accept, transform mapping, transform throw, cross-org message, plus a `webhook logging` block asserting a log row for the success, failed-authorization and invalid-payload paths. Uses a `waitForLog` poller since the handler writes its log after responding.

Production bug found **and fixed** (`src/webhook/transformer.ts`):

The 5s transform timeout never fired. `isTimedOut` was set from a `setTimeout` callback, but `context.evalCode` runs synchronously and blocks the event loop, so the timer could not run and the interrupt handler always returned `false`. A `while (true)` in transform code hung the process indefinitely — the first test run burned a full core for 17 minutes before it was killed. The interrupt handler now compares `Date.now()` against a deadline computed before `evalCode`. Interrupting also leaves the result handle alive, and disposing the runtime with it aborted the QuickJS wasm module (`Assertion failed: list_empty(&rt->gc_obj_list)`), replacing our error message; the handle is now disposed before throwing. `src/webhook/authorization.ts` has the same class of bug (no interrupt handler at all) and was left alone — see CONCERNS.md.

Behaviour pinned rather than fixed: the transformer's "fall back to the raw request body when `transform` returns undefined" path is unreachable. The wrapper copies the result with `for (const key in result)`, so `undefined` becomes `{}` and fails schema validation with a 500 before the fallback is consulted. Two tests written against the documented fallback were replaced with one asserting the real 500.

### Phase 5.a: TRPC — user, organization, settings (2026-08-29)

Three test files, 77 tests. Full suite: 265 passed / 1 skipped across 24 files, green twice in a row, `tsc --noEmit` clean.

- `helpers/trpc.ts` gained `createCallerFromToken(token?)`, which builds the caller through the real `createContext` (so token verification is exercised, not bypassed), and `expectTrpcError(promise, code)` for the repeated `rejects.toMatchObject({ code })` assertion.
- `tests/integration/trpc/user.test.ts` (23) — `isFirstUser` before/after; `signup` first-user happy path, bcrypt hash stored, second signup rejected, three input-validation cases; `login` valid/wrong password/unknown email; `me` shape, no password leak, UNAUTHORIZED for a deleted user; `updateProfile` lowercasing, same-email allowed, taken email rejected; `changePassword` bumping `pwdVersion` with the old token going stale and the returned one working, login switching to the new password, wrong current password, <8 char rejection. Every `authProcedure` asserted UNAUTHORIZED with no user.
  - Gotcha: `tokenPayloadSchema.parse()` keeps `iat`/`exp`, so token assertions need `toMatchObject`, not `toEqual`. Default `pwdVersion` is 1, not 0.
- `tests/integration/trpc/organization.test.ts` (13) — create links the caller via `UserOrganization` and seeds the Newsletter template + general/delivery settings (the mutation reads `templates/newsletter.html` relative to cwd, which is `apps/backend` under vitest); optional description; empty name rejected; `getById` for a member, UNAUTHORIZED for another user's org and for an unknown id; `update` happy path plus a cross-org attempt asserted to leave the target row untouched.
- `tests/integration/trpc/settings.test.ts` (41) — SMTP get (seeded / null), upsert create-when-absent and update-in-place (asserting a single row, i.e. the `id: "create-happens"` sentinel works), four validation cases, cross-org read+write; general settings defaults, update, create-when-absent, empty-string email/url accepted, three validation cases, cross-org; email delivery defaults, update, create-when-absent, five validation cases, cross-org; api keys create (`sk_` + 64 hex), expiry, list without the secret, delete, cross-org delete rejected with the row surviving, and cross-org create/list/delete. A final block asserts UNAUTHORIZED for all eight organization-scoped procedures with no user.

No production bugs fixed this phase. Three behaviours noted in CONCERNS.md instead:

1. `signup` throws `BAD_REQUEST` whenever *any* user exists, so LetterSpace is effectively single-account and the duplicate-email branch right below it is dead code.
2. `settings.createWebhook` / `deleteWebhook` / `listWebhooks` are TODO stubs returning `{ webhook: null }` / `{ success: true }` / `[]` while a real `Webhook` model and its own router exist.
3. `settings.deleteApiKey` with an id from another organization escapes as a raw Prisma `P2025` (500) rather than `NOT_FOUND`; the test asserts only that it rejects and the row survives.

### Phase 5.b: TRPC — list, subscriber (2026-08-29)

Two test files, 80 tests. Full suite: 345 passed / 1 skipped across 26 files, green twice in a row, `tsc --noEmit` clean.

- `tests/integration/trpc/list.test.ts` (28) — `create` (happy path, null description, empty name, non-member org → `NOT_FOUND`, unknown org); `list` (pagination metadata, three pages with no overlap, newest-first ordering, case-insensitive search across name *and* description, `_count.ListSubscribers` excluding unsubscribed rows, other orgs' lists absent, `perPage: 101` rejected); `get` (with `Organization` + `ListSubscribers.Subscriber`, unknown id, other org → `UNAUTHORIZED`); `update` and `delete` (happy path, empty name, unknown id, cross-org attempt asserted to leave the row untouched, memberships cascade-deleted while the subscriber survives); plus `UNAUTHORIZED` for all five procedures with no user.
  - Note the asymmetry the tests pin: `create`/`list` return `NOT_FOUND` for an org you are not in, while `get`/`update`/`delete` return `UNAUTHORIZED`.
- `tests/integration/trpc/subscriber.test.ts` (52) — `create` (memberships, `emailVerified` defaulting to false, metadata rows, `CONFLICT` on a duplicate email in the same org, the same email allowed in another org, invalid email, cross-org); `list` (includes + pagination + search over name/email, isolation); `get` (lists/metadata/last-10 messages, unknown id, cross-org both ways); `update` (fields, add/remove list membership diffing, metadata replaced and cleared when omitted, validation, unknown id, cross-org leaves the row untouched); `delete`; `import`; `unsubscribeToggle` (toggle both ways, cancels only `QUEUED`/`PENDING`/`RETRYING` messages of campaigns using that list, no cancellation when resubscribing, unknown membership, cross-org); public `unsubscribe` (all lists with no `cid`, only the campaign's lists with one plus `unsubscribedCount` increment, unknown subscriber succeeds, idempotent); `verifyEmail` (valid, expired, unknown); and `UNAUTHORIZED` for all seven `authProcedure` procedures.

Production bugs found **and fixed** (`src/subscriber/mutation.ts`, `importSubscribers`):

1. CSV import was completely broken. It mapped rows to `firstName`, `lastName`, `phone`, `company`, `jobTitle`, `city`, `country`, `subscribedAt` and `tags` — none of which exist on the `Subscriber` model, which has only `name` and `email`. Every import, valid file included, died with a Prisma validation error surfaced as `INTERNAL_SERVER_ERROR`. Rows now map to `{ email, name, organizationId }`, with `name` taken from a `name` column or `first_name` + `last_name` joined, and `null` when absent. A row with no email is now a `BAD_REQUEST` naming the row number instead of a 500 from Prisma.
2. `importSubscribers` was the only procedure on the router with no `userOrganization` check — any authenticated user could import subscribers into any organization by id. It now does the same membership lookup as its siblings and throws `UNAUTHORIZED`.
3. `throw new Error("No file provided")` became a `TRPCError` `BAD_REQUEST`; it was reaching clients as a 500.

Behaviour pinned rather than fixed: a CSV with an inconsistent column count still escapes as a raw `csv-parse` error (`INTERNAL_SERVER_ERROR`) rather than `BAD_REQUEST` — the test only asserts that it rejects and writes nothing. See CONCERNS.md.

### Phase 5.c: TRPC — campaign, template, message (2026-08-29)

Three test files, 132 tests. Full suite: 477 passed / 1 skipped across 29 files, green twice in a row, `tsc --noEmit` clean.

- `tests/integration/trpc/template.test.ts` (31) — `create` (happy path, null description, empty name, empty content, content missing the `{{content}}` placeholder asserted to write nothing, placeholder anywhere in the string, non-member org, unknown org); `get` (by id, unknown id, other org via their orgId → `UNAUTHORIZED`, other org's id via your own orgId → `NOT_FOUND`); `list` (pagination metadata, three pages with no overlap, newest-first, case-insensitive search across name *and* description, other orgs excluded, `perPage: 101` rejected); `update` (fields, placeholder validation leaving the row untouched, unknown id, cross-org); `delete`; plus `UNAUTHORIZED` for all five procedures with no user.
- `tests/integration/trpc/message.test.ts` (22) — `list` (pagination, campaign/subscriber summaries, filter by status, by campaign, by subscriber, combined campaign+status, an out-of-enum status rejected, search across subscriber name, subscriber email *and* campaign title, three-page walk asserting `updatedAt desc` ordering, `perPage: 101`, other orgs excluded, non-member org); `get` (includes, unknown id, cross-org); `resend` (requeues and clears `tries`/`lastTriedAt`/`error`/`messageId`, unknown id, non-member org, other org's message via your own orgId); auth block.
- `tests/integration/trpc/campaign.test.ts` (79) — `create` (DRAFT default, null description, empty title, cross-org writes nothing); `list` (counts + template/list includes, three-page walk, search over title/description/subject, isolation, `perPage: 101`, non-member org); `get` (`uniqueRecipientCount` de-duplicating a subscriber on two lists and excluding unsubscribed members, per-list `_count`, the eight message-status counters, `openRate`/`clickRate`, the zero-messages case asserting no division by zero, unknown id, both cross-org directions); `update` (fields + list replacement, clearing lists, `scheduledAt`, template/list from another org → `NOT_FOUND`, `it.each` over the five non-DRAFT statuses refusing the update and leaving the title, unknown id, cross-org); `delete` (cascades messages, leaves the subscriber); `start` (DRAFT → `CREATING`, future `scheduledAt` → `SCHEDULED`, past `scheduledAt` → `CREATING`, `it.each` refusing all five non-DRAFT statuses, and one test per precondition: subject, content, at least one list, at least one non-unsubscribed recipient, base URL, SMTP settings, email delivery settings); `cancel` (`it.each` over `CREATING`/`SENDING`/`SCHEDULED`, `QUEUED`/`PENDING`/`RETRYING` messages cancelled while `SENT` is untouched, `it.each` refusing `DRAFT`/`COMPLETED`/`CANCELLED`, unknown id, cross-org); `duplicate` (copies content/template/lists into a new DRAFT titled `Copy of …`, does not copy messages, unknown id, cross-org); `sendTestEmail` (`[Test] ` subject prefix and `from` assembled from the SMTP settings, template rendering `{{content}}`, a rejected recipient → `INTERNAL_SERVER_ERROR`, invalid email, missing SMTP settings, missing subject, missing content, unknown campaign, cross-org — each negative case also asserting `sendMail` was never called); auth block over all nine procedures.
  - `sendTestEmail` goes through a real `Mailer`, so this file mocks `nodemailer` with the `vi.hoisted()` pattern from `Mailer.test.ts`. `campaign.start` never sends mail, so the mock only matters for that one describe.
  - `createUser()` seeds `GeneralSettings` with `{}`, so `baseURL` is null and `start` fails its last precondition; the `seedSendableCampaign()` fixture sets it.

Production bugs found **and fixed** (both cross-organization data-access holes):

1. `src/message/query.ts`, `getMessage` — the procedure was `authProcedure` but looked the message up by `id` alone with no organization scoping, so any authenticated user could read any message in the system, including its rendered content and the recipient's email address. The lookup is now constrained to campaigns whose organization the caller is a member of (`Campaign.Organization.UserOrganizations.some.userId`). The input signature is unchanged and the web app does not call `message.get`, so nothing downstream breaks.
2. `src/campaign/mutation.ts`, `cancelCampaign` — the only procedure on the campaign router with no `userOrganization` membership check. Any authenticated user could cancel another organization's in-flight campaign and mass-cancel its `QUEUED`/`PENDING`/`RETRYING` messages by passing the ids. It now does the same membership lookup as its eight siblings and throws `UNAUTHORIZED`.

Behaviour pinned rather than fixed (see CONCERNS.md): `campaign.update` rebuilds `CampaignLists` with `deleteMany: {}` unconditionally, so an update that omits `listIds` drops every list on the campaign; and `campaign.start` gathers subscribers, the organization and settings and then writes only `status`, leaving the whole `pMap` block dead work.

### Phase 5.d: TRPC — dashboard, stats, webhook router (2026-08-29)

Three test files, 74 tests. Full suite: 551 passed / 1 skipped across 32 files, green twice in a row, `tsc --noEmit` clean.

- `createMessage`, `createSubscriber` and `createCampaign` gained a `createdAt` option (and `completedAt` on campaign). Every assertion in this phase turns on a 30/60-day or 6-month window, and backdating at insert time is cleaner than a follow-up `prisma.update`.
- `tests/integration/trpc/dashboard.test.ts` (20) — `messageStats` (grouped counts, empty object for an empty org, the 6-month `createdAt` cutoff, cross-org isolation); `recentCampaigns` (only `COMPLETED`, `deliveryRate` from `SENT|OPENED|CLICKED` over all messages, zero rate with no messages so no division by zero, the five newest by `createdAt desc`, `completedAt` passthrough, isolation); `subscriberGrowth` (empty, running total across days, the pre-window baseline seeding the first point, isolation); `dbSize` (per-model counts and a non-zero `total_size_mb`, all-zero for an empty org); and authorization (non-member org, unknown id, no user).
  - `countDbSize` returns `bigint` counts, so assertions use `BigInt(n)` — `tsconfig` targets below ES2020 and rejects `1n` literals.
- `tests/integration/trpc/stats.test.ts` (21) — an "empty organization" block asserting every field is zero and finite (the `|| 1` denominators are what keep it out of `NaN`); `messages` (only `processedMessages` statuses, split across the two windows); `openRate`, `deliveryRate` and `clickRate` (numerators over the window denominator, the previous-period comparison, messages with no `sentAt` ignored); `subscribers`; `unsubscribed` (per-window `unsubscribedAt`, other orgs' lists excluded); `campaigns` and `completedCampaigns`; `recipients` (distinct subscribers per window); and authorization.
- `tests/integration/trpc/webhook.test.ts` (33) — `create` (fields stored, `isActive: false`, null code fields, empty name writes nothing, non-member org); `list` (newest first, empty, isolation); `get` (by id, unknown id, both cross-org directions — their org id → `UNAUTHORIZED`, your org id → `NOT_FOUND`); `update` (fields, omitted fields left untouched, empty name, unknown id, cross-org leaves the row); `delete` (cascades `WebhookLog`, unknown id, cross-org); `logs` (newest first, cursor pagination over three rows, empty, another org's `webhookId` returns an empty page, non-member org, `limit: 101` rejected); and auth over all six procedures.
  - `webhookSchema.partial()` drops the `isActive` zod default, so an update that omits it leaves the stored value alone rather than re-enabling a disabled webhook. Pinned as `leaves omitted fields untouched`.

No production bugs fixed this phase — both routers scope every query by organization and check membership first. Five behaviours noted in CONCERNS.md instead, the two worth a decision being: `stats.getStats` computes rates with a `sentAt` numerator over a `createdAt` denominator (so a rate can exceed 100%), and `campaigns.comparison` / `completedCampaigns.comparison` are `total - lastMonth` while every other comparison is `thisMonth - lastMonth`.

### Phase 6: Cron jobs (2026-08-29)

Four test files, 81 tests. Full suite: 632 passed / 1 skipped across 36 files, green twice in a row, `tsc --noEmit` clean.

- New `tests/integration/helpers/factories/webhook-log.ts`; `createMessage` gained `tries`, `lastTriedAt` and `error` options for the retry fixtures.
- `tests/integration/cron/sendMessages.test.ts` (25) — no-op cases (no orgs, empty queue, missing SMTP settings, missing email-delivery settings, no from name/email, and the `generalSettings.defaultFromName/Email` fallback); sending (SMTP payload, transport options, `SENT` with `sentAt`/`tries`/`messageId` stripped of angle brackets, `AWAITING_WEBHOOK` when an active webhook exists, an inactive webhook ignored, a subject-less campaign skipped, and two organizations each getting their own transport); rate limiting (only the remaining slots taken, prior sends inside the window counted, nothing sent when exhausted, sends outside `rateWindow` ignored); retries (rejected → `RETRYING`, `FAILED` at `maxRetries`, a throwing transport recording `error`, `RETRYING` picked up only after `retryDelay`); and campaign completion (`SENDING` → `COMPLETED` with `completedAt`, not completed while a `RETRYING` message remains, `DRAFT` untouched).
  - `nodemailer` is mocked with the `vi.hoisted()` pattern. The import of `sendMessagesCron` must stay a static import — vitest hoists `vi.mock` above it, and a top-level `await import` fails `tsc` under this tsconfig's `module` setting.
- `tests/integration/cron/processQueuedCampaigns.test.ts` (30) — no-ops (`it.each` over the five non-`CREATING` statuses, missing content/subject/baseURL, no lists, empty lists); message creation (one `QUEUED` message per list subscriber, campaign moved to `SENDING`, unsubscribed members skipped, one message for a subscriber on two lists, non-member subscribers ignored, two orgs in one run, and the `BATCH_SIZE` of 100 asserted with 105 subscribers over two runs); idempotency (a second run adds nothing, an existing message is not duplicated or overwritten); rendered content (subscriber/campaign/organization placeholders, subscriber metadata, the unsubscribe link's `sid`/`cid`/`mid`, template `{{content}}` wrapping, the open-tracking pixel present and absent, `@TRACK` links rewritten to `/r/:id` with the suffix stripped, untagged links untouched); and scheduled campaigns.
- `tests/integration/cron/dailyMaintenance.test.ts` (17) — content nulled for an old message, kept inside the window, the row itself never deleted, `it.each` over the three pending statuses kept and the six completed statuses cleared, per-org `cleanupInterval` honoured, the schema default of 90 days, and idempotency.
- `tests/integration/cron/cleanupWebhookLogs.test.ts` (9) — old logs deleted, recent kept, the webhook row kept, the 90-day default, per-org interval, another org's logs untouched, and idempotency.

No production bugs fixed this phase. Three behaviours pinned by tests and noted in CONCERNS.md:

1. Nothing in the codebase moves a campaign from `SCHEDULED` to `CREATING`, and `processQueuedCampaigns` only reads `CREATING`. A scheduled campaign is therefore never sent. The SPEC item asked for "a scheduled campaign whose time has come creates messages"; the test asserts the real behaviour (it stays `SCHEDULED` with no messages) instead.
2. `dailyMaintenance` nulls `Message.content` but logs "Deleted N messages", and its `?? 30` fallback for `cleanupInterval` is unreachable because the schema defaults the column to 90.
3. `processQueuedCampaigns` keeps its "log this once" state in a module-level object that is never reset, so after the first occurrence a recurring skip reason is silent for the process lifetime.


## Phase 7 (2026-08-29)

Done. `pnpm --filter backend test:run` passes (37 files, 656 tests, 1 conditional skip).

- `tests/integration/api/middleware.test.ts` (7) — missing key, empty `x-api-key` header, unknown key, the key scoping results to its own organization, `lastUsed` written (fire-and-forget, polled with `@helpers/wait-for`), `lastUsed` untouched for a rejected key, and every `/api` verb behind the middleware.
- Deleted `tests/integration/api/auth.test.ts`: its two cases (missing key, invalid key) are now covered verbatim by `middleware.test.ts`.
- `update-subscriber.test.ts` (+5) — invalid email rejected without mutating the row, empty `lists` array, unknown list id, a list owned by another org, and a cross-org update returning 404 with the row unchanged.
- `create-subscriber.test.ts` (+2) — a list owned by another org rejected with nothing created, and the same email accepted independently in two organizations (POST returns 201).
- `get-subscribers.test.ts` (+8) — page 2, the `page=1 perPage=100` defaults, a page past the end, combined `emailEquals`+`nameEquals`, a filter matching nothing, a filter that must not reach another org's subscriber, `page=0`, and `perPage=-1`.
- `tests/integration/user.test.ts` (+2) — `/docs/` serves HTML, `/docs/swagger-ui-init.js` serves the spec, and the generated spec exposes `get`/`post` on `/api/subscribers` and `get`/`put`/`delete` on `/api/subscribers/{id}`.

No production bugs fixed this phase; two behaviours noted in CONCERNS.md (API key expiry is never enforced, `lastUsed` is written unawaited).

Note for future phases: concurrent supertest requests against the shared `app` instance produce `ECONNRESET`. Await requests one at a time.

## Current Phase

Phase 8: CI — not started.

## Notes

Three tests were already failing before this phase (baseline), all test-side bugs rather than production bugs:

1. `tests/integration/user.test.ts` asserted `GET /` returns 200, but no `/` route exists in tests (the SPA static handler is not mounted) — it returned 404. Replaced with a `GET /docs/` swagger smoke assertion.
2. `src/utils/placeholder-parser.test.ts` "various types of placeholders" expected `Web: domain.com/web` in the output, but no such placeholder is in the template. Copy-paste error in the expectation; removed the stray segment.
3. `tests/integration/api/subscribers/create-subscriber.test.ts` doubleOptIn test hard-threw unless `RESEND_API_KEY`/`RESEND_TEST_EMAIL` were set, and sends a real email via Resend. Changed to `it.skipIf(...)` — the spec forbids sending real mail from tests.

No production behaviour was changed except exporting `appRouter` from `src/app.ts`.

Environment: the committed `.env.test` expects `postgres:password@localhost:5432`. The local Postgres had password `postgres`, so the role password was reset to match the committed file; the `letterspace_test` database was created.

Phase 2 notes: no production bugs found; `message-status.ts` groups are consistent and cover the full enum. `cron.utils.ts` relies on a module-level `runningJobs` map, so tests must use distinct job names per test — there is no reset hook.

### Phase 8: CI (2026-08-29)

- Added `.github/workflows/test.yaml`: single `backend` job on `push` and `pull_request`, `postgres:16` service with a `pg_isready` health check, `pnpm/action-setup@v4` (version comes from the root `packageManager` field), `actions/setup-node@v4` with Node 22 + pnpm cache, then `pnpm install --frozen-lockfile` → `pnpm --filter backend generate` → `pnpm --filter backend migrate:deploy` → `pnpm --filter backend test:run`.
- Env precedence: the job sets `DATABASE_URL` (pointing at the service container, `ci:ci@localhost:5432/letterspace_ci`) and `JWT_SECRET` (`secrets.TEST_JWT_SECRET` with a literal fallback) at job level. No code change was needed to make these win over the committed `apps/backend/.env.test` — both loaders read the file without `override`:
  - `dotenv-cli` (the `test`/`test:run` scripts) calls `dotenv.config({ override })` where `override` is only set by `-o`/`--override`, which we do not pass;
  - `tests/integration/helpers/setup.ts` calls `config({ path: ".env.test" })`, and `dotenv` does not overwrite existing `process.env` keys.
  - Verified locally: `DATABASE_URL=postgresql://from-env/x pnpm exec dotenv -e .env.test -p DATABASE_URL` prints the env value, while an unset run prints the file value.
- `migrate:deploy` deliberately runs outside `dotenv -e .env.test`, so in CI it uses the workflow `DATABASE_URL` directly — the same database the tests then connect to. (`setup.ts` also runs `prisma migrate deploy` per file, so the explicit step is belt-and-braces and gives a clean failure point if migrations break.)
- Added a comment header to `apps/backend/.env.test` recording that it is local defaults only and that CI overrides it.
- Full suite re-verified: 36 files, 654 passed / 1 skipped.


### Phase 9: Documentation (2026-08-29)

Docs only — no source or test changes. Full suite re-verified through Turbo afterwards: `pnpm test` → 36 files, 654 passed / 1 skipped.

- `docs/testing.md` (new) — running the suite, test-database setup and the `.env.test` override rules, running a subset, isolation semantics, worked TRPC and REST examples, a helper table, the Prisma `omit` gotcha, unit tests, the CI workflow, and troubleshooting. Added to the `docs/README.md` index.
- `apps/backend/CLAUDE.md` — Testing section rewritten: harness layout tree, DB reset semantics (`fileParallelism: false` is load-bearing), factories, `createCaller` vs `createCallerFromToken`, single-file/single-test invocations. Added `pnpm test:watch` to the commands block.
- Root `CLAUDE.md` — `pnpm test` in the commands block, a "Test database" subsection under Database, and a link from the existing `.env.test` note.
- `README.md` — a short Testing section between Environment Variables and Documentation.

Stale claims corrected while writing (both were wrong before this plan, not introduced by it):

- `apps/backend/CLAUDE.md` said "Cron jobs are disabled when `NODE_ENV=development`" and "[Mailer] returns mock success in development". There is no `NODE_ENV` reference anywhere in `apps/backend/src` — verified with grep. Root `CLAUDE.md` already documented the truth. The backend file now matches.
- The SPEC's own Phase 3 wording ("mock success path in `NODE_ENV=development`") rests on the same stale assumption; the Phase 3 tests already pinned real behaviour instead. Noted in CONCERNS.md at the time.

Doc examples were checked against the code rather than written from memory: `list.get` returns the list directly (not `{ list }`), and the REST tests authenticate with an `x-api-key` header (not `Authorization: Bearer`). Both examples were corrected after checking. The documented `pnpm test:run <file>` and `-t <name>` invocations were run to confirm the `dotenv -e .env.test --` wrapper forwards arguments.

## Plan complete

All nine phases are done. `PROMPT.md` now points at `todo.md`.

Suite state: 36 files, 654 passed / 1 skipped (the skipped one is the double-opt-in test that needs real Resend credentials — see CONCERNS.md). Green twice in a row from a clean database. `pnpm test` at the repo root runs it through Turbo. CI is defined in `.github/workflows/test.yaml` but has never executed — this environment has no GitHub access, so the first push is its first real run.
