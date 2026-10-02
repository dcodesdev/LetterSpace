# Sending pipeline

How a started campaign turns into delivered email. Four cron jobs are registered at boot in `apps/backend/src/cron/cron.ts`.

| Job | Schedule | Does |
| --- | --- | --- |
| `process-queued-campaigns` | every second | Turns `CREATING` campaigns into `Message` rows |
| `send-queued-messages` | every 5 seconds | Hands queued messages to SMTP |
| `daily-maintenance` | `0 0 * * *` | Blanks old message bodies |
| `cleanup-webhook-logs` | `0 1 * * *` | Deletes old webhook logs |

Each job is wrapped by `cronJob()`, which skips a tick if the previous run of that job is still going, so runs never overlap. `SIGINT`/`SIGTERM` stops all jobs before exit.

## Building messages

`processQueuedCampaigns` takes campaigns in `CREATING` and, for up to 100 subscribers per pass (`BATCH_SIZE`), builds one `Message` per subscriber that does not already have one:

1. Wrap content in the template (`{{content}}` replacement).
2. Append the open-tracking pixel if `openTracking` is on.
3. Substitute placeholders, including the per-recipient `unsubscribe_link`.
4. Rewrite `@TRACK` links into tracked redirects ([tracking.md](tracking.md)).
5. Insert the rows with status `QUEUED`.

The rendered HTML is stored per message, so each recipient's copy is fixed at build time. When no unsubscribed-free subscriber is left without a message, the campaign moves to `SENDING`.

A campaign is skipped (and logged once) if it is missing content, subject, organization, or `baseURL` in general settings.

## Delivering messages

`sendMessages` runs per organization and needs both SMTP settings and email delivery settings; organizations missing either are skipped with a warning.

For each organization:

1. Count messages processed within the last `rateWindow` seconds. Available slots = `rateLimit − that count`. Zero slots means skip this tick.
2. Take up to that many messages that are `QUEUED`, or `RETRYING` with `lastTriedAt` older than `retryDelay` seconds.
3. Send them with `p-map` at `concurrency` parallelism through `Mailer` (`apps/backend/src/lib/Mailer.ts`).

Sender identity is `smtpSettings.fromName/fromEmail`, falling back to `defaultFromName`/`defaultFromEmail` in general settings. If neither yields a name and an address, the organization is skipped.

On success the message becomes `SENT`, or `AWAITING_WEBHOOK` when the organization has at least one active webhook — the final status then comes from the provider ([webhooks.md](webhooks.md)). The SMTP `messageId` is stored with angle brackets stripped, which is what webhook payloads are matched against.

On failure the message becomes `RETRYING`, or `FAILED` once `tries` reaches `maxRetries`. Every attempt increments `tries` and sets `lastTriedAt`.

When an organization has no sendable and no retrying messages left, `SENDING` campaigns whose messages are all in a completed state are marked `COMPLETED` with a `completedAt`.

## Tuning

`rateLimit`, `rateWindow`, `maxRetries`, `retryDelay`, `concurrency` and `connectionTimeout` are per organization — see [settings.md](settings.md).

## Development

Sending is not disabled automatically by `NODE_ENV`; the cron jobs run and `Mailer` talks to whatever SMTP host you configured. Point a development organization at a catch-all SMTP server (Mailpit, Mailhog) rather than a live provider.
