# Settings

Settings are per organization. All procedures need `organizationId` and check membership.

## SMTP

`settings.updateSmtp` upserts the organization's SMTP row; `settings.getSmtp` reads it back. Nothing sends until this exists.

| Field | Notes |
| --- | --- |
| `host`, `port`, `username`, `password` | Required |
| `fromEmail`, `fromName` | Sender identity; falls back to the general settings defaults |
| `secure` | Boolean, stored on the record |
| `encryption` | `STARTTLS`, `SSL_TLS` or `NONE` |
| `timeout` | Connection timeout in ms, default 30000 |

`Mailer` derives the transport from `encryption`: `STARTTLS` uses port 587 with TLS upgrade required, `SSL_TLS` uses port 465 with a direct TLS connection, `NONE` uses port 25 with TLS disabled. Your explicit `port` wins over those defaults. The connection timeout used when sending comes from email delivery settings, not from this `timeout` field.

Passwords are stored in plain text in the database.

Check the configuration end to end:

```
POST /trpc/settings.testSmtp   { organizationId, email }
```

It sends a fixed test email and returns 500 if the send fails.

## Email delivery

`settings.getEmailDelivery` / `settings.updateEmailDelivery` control the send loop ([sending.md](sending.md)).

| Field | Default | Effect |
| --- | --- | --- |
| `rateLimit` | 100 | Max messages processed per window |
| `rateWindow` | 3600 | Window length in seconds |
| `maxRetries` | 3 | Attempts before a message is `FAILED` |
| `retryDelay` | 300 | Seconds to wait before retrying |
| `concurrency` | 5 | Parallel sends |
| `connectionTimeout` | 30000 | SMTP connection timeout in ms |

A row with these defaults is created with the organization.

## General

`settings.getGeneral` / `settings.updateGeneral`.

| Field | Default | Used for |
| --- | --- | --- |
| `baseURL` | none | Root URL for unsubscribe links, the open pixel and tracked links. Campaigns cannot start without it |
| `defaultFromEmail`, `defaultFromName` | none | Sender fallback when SMTP settings have none |
| `cleanupInterval` | 90 | Retention in days, see [maintenance.md](maintenance.md) |

## API keys and webhooks

See [rest-api.md](rest-api.md) and [webhooks.md](webhooks.md).

## Environment variables

Set on the backend process, not per organization.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | | PostgreSQL connection string |
| `JWT_SECRET` | yes | | Signs session tokens |
| `PORT` | no | 5000 | HTTP port |
| `WEBHOOK_MEMORY_LIMIT` | no | 16777216 | Webhook transform sandbox memory, bytes |
| `WEBHOOK_MAX_STACK_SIZE` | no | 262144 | Webhook transform sandbox stack, bytes |
| `DEBUG` | no | | Any value enables `logger.debug` output |

`DATABASE_URL` and `JWT_SECRET` are validated at boot; the process exits if either is missing.
