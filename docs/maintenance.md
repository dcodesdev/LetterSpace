# Maintenance jobs

Two cron jobs keep the database from growing without bound. Both are per organization and driven by `cleanupInterval` in general settings.

| Job                    | Schedule | Action                                 |
| ---------------------- | -------- | -------------------------------------- |
| `daily-maintenance`    | midnight | Sets `content` to null on old messages |
| `cleanup-webhook-logs` | 01:00    | Deletes old `WebhookLog` rows          |

## Message body cleanup

`dailyMaintenance` blanks the stored HTML of messages that are older than `cleanupInterval` days and are not `QUEUED`, `PENDING` or `RETRYING`. The message row itself stays, so statuses, timestamps and every analytics number are preserved — only the body is dropped.

Consequence: previewing an old message shows nothing, and resending it sends an empty email. See [messages.md](messages.md).

Default when an organization has no general settings row: 90 days.

## Webhook log cleanup

`cleanupWebhookLogs` deletes webhook logs older than `cleanupInterval` days for each organization. Default when general settings are missing: 90 days.

## Changing retention

```
POST /trpc/settings.updateGeneral   { organizationId, cleanupInterval: 30 }
```

`cleanupInterval` is an integer number of days, minimum 1, default 90. The same value controls both jobs.

## Startup repair

On boot, `apps/backend/src/index.ts` marks every `QUEUED`, `PENDING` or `RETRYING` message as `CANCELLED` when its campaign is already `CANCELLED`, cleaning up after older versions that cancelled campaigns without cancelling messages.
