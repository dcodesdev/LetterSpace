# Incoming webhooks

Webhooks let your SMTP provider report delivery events back to LetterSpace, so message statuses reflect what actually happened after handoff. These are inbound only — LetterSpace does not call out to your systems.

## Endpoint

```
POST /webhook/<webhookId>
```

Create a webhook in **Settings → Webhooks** (or `webhook.create`) and give your provider that URL. Inactive webhooks return 404.

Having at least one active webhook changes the send pipeline: successfully sent messages land in `AWAITING_WEBHOOK` instead of `SENT`, and wait for the provider to confirm delivery.

## Request handling

`apps/backend/src/webhook/handler.ts` runs, in order:

1. **Authorization** — if `authCode` is set, run it; a falsy result is 401.
2. **Transform** — normalize the payload into `{ messageId, event, error? }`.
3. **Process** — find the message by `messageId` within the webhook's organization and update its status.

Every request to an existing webhook, active or not, is written to `WebhookLog` with the raw body, transformed payload, response code and body, any error, and the duration in milliseconds — successes and failures alike. Read them with `webhook.logs { webhookId, organizationId, limit, cursor }` or in the webhook detail page. A `webhookId` outside your organization returns `NOT_FOUND`.

## Authorization code

Name the function `authorize` and return true to accept:

```javascript
function authorize(headers, body, query, params) {
  return headers["x-api-key"] === "your-secret-key"
}
```

It runs in a QuickJS sandbox with no network, timers or `require`, a 5 second execution timeout, a 128MB memory limit and a 1MB stack. `JSON` is QuickJS's built-in, so strings with quotes, backslashes or newlines are escaped correctly. A thrown error or a timeout is 500; a falsy return is 401.

## Transform code

Name the function `transform` and return the normalized event:

```javascript
function transform(payload, headers, query) {
  return {
    messageId: payload["smtp-id"],
    event: payload.event,
    error: payload.reason,
  }
}
```

`messageId` and `event` are required strings; `error` is optional. Extra keys are dropped by validation.

With no transform code, the raw request body must already match that shape. If the function returns undefined, the raw body is validated as a fallback.

Sandbox limits for transforms: a 5 second execution timeout, memory from `WEBHOOK_MEMORY_LIMIT` (default 16MB) and stack from `WEBHOOK_MAX_STACK_SIZE` (default 256KB). Exceeding them fails the request with 500.

Both `authCode` and `transformCode` are stored as plain text in the database, secrets included.

## Matching messages

`messageId` is matched against the id the SMTP server returned when LetterSpace sent the mail, stored with surrounding angle brackets stripped. An unmatched id is 404; an unrecognized event name is 400.

## Event mapping

| Event names                       | Resulting status                                 |
| --------------------------------- | ------------------------------------------------ |
| `pending`, `delayed`              | `PENDING`                                        |
| `delivered`, `sent`               | `SENT`                                           |
| `opened`, `open`                  | `OPENED`                                         |
| `clicked`, `click`                | `CLICKED`                                        |
| `bounced`, `bounce`, `failed`     | `FAILED`, error defaults to `Email bounced`      |
| `complained`, `complaint`, `spam` | `COMPLAINED`, error defaults to `Spam complaint` |

Event names are lowercased before lookup. An `error` field in the transformed payload overrides the default text.

## Manage webhooks

| Procedure        | Input                                                           |
| ---------------- | --------------------------------------------------------------- |
| `webhook.create` | `{ organizationId, name, isActive, authCode?, transformCode? }` |
| `webhook.update` | `{ id, organizationId, ...partial }`                            |
| `webhook.delete` | `{ id, organizationId }`                                        |
| `webhook.list`   | `{ organizationId }`                                            |
| `webhook.get`    | `{ id, organizationId }`                                        |
| `webhook.logs`   | `{ webhookId, organizationId, limit, cursor? }`                 |

The `settings.createWebhook`, `settings.deleteWebhook` and `settings.listWebhooks` procedures are stubs that do nothing — use the `webhook.*` router.

Logs are pruned nightly; see [maintenance.md](maintenance.md).
