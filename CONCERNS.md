## Critical

- **The REST API re-subscribes people who unsubscribed.** `POST /api/subscribers` (existing email) and `PUT /api/subscribers/:id` in `src/api/server.ts` rebuild memberships with `ListSubscribers: { deleteMany: {}, create: ... }`, recreating every row with `unsubscribedAt = null`. A signup-form re-submit silently puts someone back on every list they left, and erases the unsubscribe history. Contradicts `docs/unsubscribes.md`.

## High

- `apps/backend/prisma/client/sql` is now untracked, but `scripts/generate-prisma-sql.sh` and both Docker builds have never been run (no Docker here). Build `docker build .` and `docker build -f Dockerfile.node .` before committing, or the images ship without TypedSQL output (see the untrack-typedsql SPEC's "Manual verification").
- **`user.signup` refuses to create a second account.** It throws `BAD_REQUEST` if `prisma.user.count()` is non-zero, so the instance is permanently single-user with no invite/team flow, and the duplicate-email check immediately below it is unreachable dead code. If multi-user was intended, this is the blocker.
- `settings.createWebhook`, `deleteWebhook` and `listWebhooks` are TODO stubs — they return `{ webhook: null }`, `{ success: true }` and `[]` with the real implementation commented out, while a full `Webhook` model and a separate `webhookRouter` exist. The settings UI silently no-ops.
- `sendMessages` marks a message `PENDING` before sending and never resets it if the process dies mid-send; a crashed run leaves messages stranded in `PENDING`, which no query ever picks back up.
- The CI workflow (`.github/workflows/test.yaml`) is on `origin/main`, but no run has been confirmed from here (no GitHub access) — check the Actions tab that it actually ran and passed.
- A commit `d3c5f46 "Phase 1: Test harness hardening"` appeared on `chore/adding-tests` without the loop running `git commit` — something in the environment (a hook or wrapper) committed the working tree mid-phase. Worth checking why, since the loop is supposed to leave all changes uncommitted.
- No `List-Unsubscribe` / `List-Unsubscribe-Post` headers: `Mailer.sendEmail` can't set custom headers and there is no RFC 8058 one-click endpoint. Gmail and Yahoo require this for bulk senders, so campaigns risk spam-foldering or rejection.
- `shutdown` in `src/index.ts` calls `process.exit(0)` without waiting for an in-flight send or closing the HTTP server (`app.listen` keeps no handle), so a deploy mid-send can strand messages in `PENDING`.
- `docker-compose.yaml` and `docker-compose.node.yaml` ship `JWT_SECRET: your_super_secret_jwt_key` (and Postgres `user`/`password`), and `src/constants.ts` accepts any non-empty secret. A stack started from the documented compose file signs sessions with a public key, so tokens can be forged.

## Medium

- `generate` is now `prisma generate --sql`, so Turbo `dev`/`build`/`check-types`/`test` need a running, migrated database reachable via `DATABASE_URL`. Prisma reads `apps/backend/.env`, not `.env.test`, so a local `pnpm test` with only `.env.test` will fail at generate.
- `sendMessages` computes `availableSlots` from the rate window, but the rate-window count includes `FAILED` and `COMPLAINED` (both in `processedMessages`), so failures consume send quota.
- `subscriber.import` now maps rows to `{ email, name, organizationId }`; phone/company/tags columns are silently dropped. Worth deciding whether they should land in `SubscriberMetadata` instead.
- `settings.updateSmtp` upserts on `where: { id: smtpSettings ? smtpSettings.id : "create-happens" }` — a sentinel string standing in for "no row". `SmtpSettings.organizationId` is not unique in the schema, so nothing prevents two SMTP rows per org if two updates race.
- The REST API has no rate limiting: a valid API key can hammer `/api/subscribers` unbounded.
- `GET /api/subscribers` accepts any positive `perPage`, so `?perPage=1000000` will attempt to serialize the whole org in one response.
- `src/cron/cron.utils.ts` keeps its lock state in a module-level `Map` with no reset/clear. Tests must use a unique job name each time, and a real job whose function never settles would be locked out forever with no timeout or recovery.
- Webhook events overwrite message status with no ordering guard (`src/webhook/processor.ts`): a late `delivered` turns `OPENED`/`CLICKED` back into `SENT`, and a `delayed`/`pending` event sets `PENDING`, which isn't a completed status, so the campaign can sit in `SENDING` indefinitely.
- The webhook handler discards `processWebhookEvent`'s result (404 message not found, 400 unknown event) and always responds and logs 200, so misconfigured transforms look healthy and providers never retry.
- Bounces and complaints never suppress the subscriber: `bounced`/`complained`/`spam` only set the one message's status, so later campaigns keep mailing them and sender reputation suffers.
- Nothing in the schema prevents duplicate messages: there is no `@@unique([campaignId, subscriberId])` on `Message`, so two overlapping `processQueuedCampaigns` runs (e.g. a second instance) both insert and both send.
- `message.resend` resets any message to `QUEUED` regardless of state: a `PENDING` message is sent twice, cancelled campaigns and since-unsubscribed subscribers get mail, engagement status is lost, and a message whose `content` was nulled by `dailyMaintenance` goes out blank and is marked `SENT`.
- `subscriber.import` upserts with `update: sub`, and `sub.name` is `null` when the CSV has no name columns, so re-importing a plain email list wipes every existing subscriber's name.
- `list.delete` has no guard for `SCHEDULED`/`CREATING`/`SENDING` campaigns; the `CampaignList` cascade silently drops that list's recipients from them.
- `user.login` (TRPC) has no rate limiting or lockout anywhere, so online password guessing is unlimited. Separate from the REST rate-limit entry above.
- `docker-compose.yaml`/`docker-compose.node.yaml` `depends_on: db` has no healthcheck / `service_healthy` condition, so the backend can start before Postgres accepts connections.
- Docker images (`Dockerfile`, `Dockerfile.node`) never set `USER`; the server, cron and the QuickJS sandbox run as root.
- `.github/workflows/docker.yaml` derives image tags from `package.json`, not the git tag: a manual run from any branch overwrites `:<version>` and `:latest` with unreleased code, a tag push without a version bump overwrites the previous release's images, and image builds don't wait on tests.

## Low

- Migration `20261002120000_add_hot_column_indexes` uses plain `CREATE INDEX` (not `CONCURRENTLY`), so on a large `Message` table the upgrade blocks writes to it while the indexes build.
- `maxRetries` now means total send attempts (per the fix-concerns plan), but the settings field is still labelled "Max retries" and accepts 0, which behaves like 1. Consider renaming the label or the semantics.
- Org-membership failures are inconsistent across routers: `list.create`/`list.list` throw `NOT_FOUND`, while `list.get`/`update`/`delete` and every subscriber procedure throw `UNAUTHORIZED`. The tests pin current behaviour.
- The transformer's "fall back to the raw body when transform returns undefined" path is dead code: the wrapper copies the result with `for (const key in result)`, so `undefined` becomes `{}`, which then fails schema validation with a 500. The 400/fallback branch can never be reached. Test pins the actual behaviour.
- `Mailer.sendEmail` throws on transport failure rather than returning `{ success: false }`; callers in `cron/sendMessages.ts` and `campaign/mutation.ts` rely on that throw. The mixed success-value/exception contract is easy to misuse.
- Both tracking endpoints respond _before_ their database write finishes. Tests must poll (`@helpers/wait-for`), and any that do not can leak a write into the next test's freshly reset database.
- `authenticateApiKey` updates `lastUsed` without awaiting and only logs on failure, so `lastUsed` is best-effort, not guaranteed, and tests must poll for it.
- CI `JWT_SECRET` falls back to the literal `ci-jwt-secret` when the `TEST_JWT_SECRET` secret is unset, so CI never fails loudly if the secret goes missing.
- CI assumes migrations alone produce a usable schema (no seed step).
- The unit tests under `src/**` still load `tests/integration/helpers/setup.ts`, so each one pays a full DB reset it does not need. Worth a separate vitest project for unit vs integration if the suite gets slow.
- Vitest emits `ENOENT ... prisma/client/runtime/library.js.map` warnings on every run. Harmless (missing sourcemap in the generated client) but noisy.
- `user.signup` accepts a 1-character password (`z.string().min(1)`), while `changePassword` requires 8.
- `settings.getSmtp` and `updateSmtp` return the full `SmtpSettings` row, including the SMTP `password`, to the browser (it lands in the settings form). Members only, but the credential is always readable client-side.
- `useSession` (`apps/web/src/hooks/useSession.ts`) now deletes the `token` cookie whenever `user.me` fails after react-query's retries, including network errors, so a backend outage logs users out. No web test harness exists, so the Phase 8 web fixes are only type-checked, linted and built.
- `list.get` still loads every `ListSubscriber` with the full `Subscriber` (including `emailVerificationToken`), unpaginated. The web app doesn't call it.
- The recipients stat SQL (`prisma/sql/countDistinctRecipients*.sql`) hard-codes the `processedMessages` status list (must be kept in sync with `src/utils/message-status.ts` by hand), and the time-range query still windows on `createdAt` while every rate now windows on `sentAt`.
- Placeholder values are not HTML-escaped when substituted into email HTML (`src/utils/placeholder-parser.ts`); a subscriber name or metadata value containing markup is rendered as HTML.
- Templates can be edited or deleted (`onDelete: SetNull`) while a campaign using them is `CREATING`; later batches render with the new template or none, and drafts lose their template silently.
