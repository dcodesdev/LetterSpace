# Progress

## Completed Phases

### Phase 1: Replace real-SMTP tests with mocked-mailer tests

- `tests/integration/api/subscribers/create-subscriber.test.ts`: the Resend-gated doubleOptIn test is now an always-running test with `nodemailer` mocked (same `vi.hoisted` + `vi.mock` pattern as `campaign.test.ts`). It reuses the factory SMTP row (adds a `fromEmail`), upserts a `baseURL`, and asserts 201, `emailVerified: false`, the attached list, the DB row (unverified, token set) and one `sendMail` call to the subscriber. No `RESEND_*` references remain.
- `tests/integration/trpc/settings.test.ts`: new `testSmtp` block — success, rejected recipient (`INTERNAL_SERVER_ERROR` "Failed to send test email"), transport rejection (`INTERNAL_SERVER_ERROR` with the transport's message), missing SMTP settings (`BAD_REQUEST`, no send), non-member caller, and no user. `testSmtp` itself is unchanged.
- `testSmtp` does not call `transporter.verify`, so only `sendMail` failures are covered.
- `testSmtp` has no membership check; a non-member's call succeeds. The test pins that and it is logged in CONCERNS.md (High).

### Phase 2: Webhook hardening

- `src/webhook/authorization.ts`: `runAuthorization` now has the same 5 s deadline as `transformer.ts` (interrupt handler, `isTimedOut`, handler reset in `finally`, interrupted result disposed). A timeout returns 500 with `"Authorization code execution timed out"` instead of the generic `"Authorization code error"`.
- `src/webhook/handler.ts`: the webhook is looked up by id without the `isActive` filter (`findUnique`), 404 when missing or inactive. The `WebhookLog` write is skipped when no row exists, so unknown ids no longer log a Prisma FK error; inactive webhooks still get a log row.
- `tests/integration/webhook/handler.test.ts`: auth-code `while (true) {}` test (500, "timed out", message untouched, 15 s test timeout); unknown id writes no log and does not hit "Failed to log webhook request"; inactive webhook writes a 404 log.
- `docs/webhooks.md`: auth code timeout and the logging rule updated now (the Phase 6 doc item still covers `docs/testing.md` and `docs/subscribers.md`).

### Phase 3: Settings and subscriber import error handling

- `src/settings/mutation.ts`: `deleteApiKey` looks the key up with `findFirst({ id, organizationId })` and throws `NOT_FOUND` "API key not found" before deleting, so another org's key id no longer leaks a Prisma `P2025` 500.
- `src/subscriber/mutation.ts`: `import` rethrows `csv-parse` errors as `BAD_REQUEST` `Invalid CSV: <message>`, and de-duplicates rows by email (last row wins, via a `Map`) before the transaction. The returned `count` is the number of unique emails.
- Tests: `settings.test.ts` expects `NOT_FOUND` for another org's key (and still asserts it survives); `subscriber.test.ts` pins `BAD_REQUEST` + `Invalid CSV:` for a bad column count, and adds a duplicate-email import (one subscriber, later row's name, list membership counted once).

### Phase 4: Campaign mutations

- `src/campaign/mutation.ts` `updateCampaign`: the `CampaignLists` rebuild is only spread into the update when `input.listIds !== undefined`; `listIds: []` still clears the lists.
- `startCampaign`: the campaign query selects only `CampaignLists.listId` (no `ListSubscribers → Subscriber` include); the `Map`/nested `pMap` is replaced by one `listSubscriber.findFirst` on those lists with `unsubscribedAt: null`. Same `BAD_REQUEST` "Campaign must have at least one recipient". `p-map` import removed. The `Template` include was left as is.
- `tests/integration/trpc/campaign.test.ts`: new "keeps the lists when listIds is omitted" test; there was no existing test pinning the old drop behaviour, and the `listIds: []` test already existed.

### Phase 5: Stats and dashboard

- `src/stats/query.ts`: `campaigns.comparison` and `completedCampaigns.comparison` are now `thisMonth - lastMonth`. `recipients.allTime`/`thisMonth`/`lastMonth` are always `number` (`Number(count ?? 0)`), and `comparison` is the difference of those, so an empty result is `0`.
- `src/dashboard/query.ts`: `subscriberGrowth` takes the previous total from `subscriberGrowthCumulative.at(-1)`. `recentCampaigns` stats come from one `message.groupBy({ by: ["campaignId", "status"] })` instead of a `pMap` with two counts per campaign; output shape unchanged. `p-map` import removed.
- Tests: `stats.test.ts` replaces the `total - lastMonth` pinning test with `thisMonth - lastMonth` tests for campaigns and completed campaigns, and expects numbers (not `BigInt`) for `recipients`. `dashboard.test.ts` adds a running-total test across four days from a baseline. A null-date growth row cannot be produced (`Subscriber.createdAt` is non-null), so the skipped-row branch is not tested directly.

### Phase 6: Documentation

- `src/cron/dailyMaintenance.ts`: logs now say "Cleared content of N messages older than D days" / "Total messages cleared"; `totalDeletedMessages` renamed `totalClearedMessages`. No test asserted the old text; `docs/maintenance.md` already said content is nulled. `?? 30` fallback unchanged (CONCERNS.md entry rewritten to cover only that).
- `docs/testing.md` and `apps/backend/CLAUDE.md`: "all 19 models" replaced with "every model".
- `docs/subscribers.md`: CSV import section rewritten to match the current `subscriber.import` (email required, `name`/`first_name`+`last_name`, `Invalid CSV:` errors, de-duplication, name overwrite).
- `docs/webhooks.md` already stated the 5 s auth-code timeout (done in Phase 2). Neither `docs/testing.md` nor `apps/backend/CLAUDE.md` mentioned the Resend-gated test or `RESEND_*`.

### Phase 7: Check

- `pnpm --filter backend lint`: 0 errors (1 existing warning in `src/lib/Mailer.test.ts`, not touched by this plan). `pnpm --filter backend check-types` is clean.
- `pnpm --filter backend test:run`: 36 files, 668 tests passed, including every test added in Phases 1–6 and no skipped Resend test. Run against a freshly created `letterspace_test` on the local Postgres, with `DATABASE_URL` overridden in the environment (the local server's credentials are `postgres:postgres`, not the `postgres:password` in `.env.test`; the file was not changed).
- Root `pnpm check-types` failed in `web`: its TS lib has no `Array.prototype.at`, and it type-checks `src/dashboard/query.ts`. Replaced `subscriberGrowthCumulative.at(-1)` with an index lookup; root check-types and the dashboard tests pass.
- Prettier: every touched TS file passes. The touched Markdown files (`CONCERNS.md`, `docs/subscribers.md`, `docs/webhooks.md`, `SPEC.md`) were left as they are: Prettier was already failing on 14 of the `docs/*.md` files in HEAD (unaligned tables, `*emphasis*`), and `--write` would reformat content these phases didn't change.
- `CONCERNS.md`: none of the fixed concerns are left. Removed the "tests have not been run" entry and merged the two duplicate `settings.testSmtp` membership entries into one. The file is still grouped Critical/High/Medium/Low.

## Current Phase

All phases complete.

## Notes

- 2026-10-02: no Postgres server in this environment (only client binaries under `/usr/lib/postgresql/16/bin`; `pg_isready` gets no response), so the Phase 1 tests were type-checked (`pnpm --filter backend check-types`) and Prettier-checked but not executed. Logged in CONCERNS.md.
- 2026-10-02 (Phase 2): Postgres is now running on localhost:5432 but rejects the `.env.test` credentials (`P1000` for `postgres:password`), so the Phase 2 tests were type-checked, linted and Prettier-checked but not executed.
- 2026-10-02 (Phase 3): `.env.test` credentials are still rejected (`prisma migrate deploy` fails in `setup.ts`), so the Phase 3 tests were type-checked, linted and Prettier-checked but not executed.
- 2026-10-02 (Phase 4): `.env.test` credentials still rejected; the campaign tests were type-checked, linted and Prettier-checked but not executed.
- 2026-10-02 (Phase 5): `.env.test` credentials still rejected; the stats/dashboard tests were type-checked, linted and Prettier-checked but not executed.
- 2026-10-02 (Phase 6): docs/log-text only; type-checked and linted, no tests run.
