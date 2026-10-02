# Messages

One `Message` row is one email to one subscriber for one campaign. It stores the rendered HTML, the delivery status, retry counters and the SMTP message id.

## Statuses

| Status | Set by |
| --- | --- |
| `QUEUED` | Message created, or resent by hand |
| `PENDING` | Picked up by the sender cron, or a `pending`/`delayed` webhook |
| `SENT` | SMTP accepted it, or a `delivered`/`sent` webhook |
| `AWAITING_WEBHOOK` | SMTP accepted it and the organization has an active webhook |
| `OPENED` | Tracking pixel loaded, or an `opened` webhook |
| `CLICKED` | Tracked link followed, or a `clicked` webhook |
| `FAILED` | Send threw and `tries` reached `maxRetries`, or a `bounced`/`failed` webhook |
| `RETRYING` | Send failed and retries remain |
| `CANCELLED` | Campaign cancelled, or the subscriber unsubscribed while queued |
| `COMPLAINED` | A `complained`/`spam` webhook |

Grouped sets used across queries (`apps/backend/src/utils/message-status.ts`):

- **pending**: `QUEUED`, `PENDING`, `RETRYING`
- **delivered**: `SENT`, `OPENED`, `CLICKED`
- **opened**: `OPENED`, `CLICKED`
- **processed**: delivered plus `AWAITING_WEBHOOK`, `FAILED`, `COMPLAINED` — this is what counts against the rate limit
- **completed**: processed plus `CANCELLED` — a campaign is `COMPLETED` when all its messages are in this set

Status advances by event, not by strict order: the pixel only promotes `SENT` or `AWAITING_WEBHOOK` to `OPENED`, and a click only promotes a message that is not already `CLICKED`.

## Browse

```
POST /trpc/message.list
{ "organizationId": "...", "campaignId": "...", "subscriberId": "...", "status": "FAILED", "page": 1, "perPage": 10, "search": "jane" }
```

`campaignId`, `subscriberId` and `status` are optional filters. `search` matches subscriber name, subscriber email and campaign title. Results are newest-updated first and include the campaign and subscriber.

`message.get { id }` returns one message with its campaign and subscriber. The dashboard uses it to preview the exact HTML that recipient received and to show the error text on failures.

## Resend

```
POST /trpc/message.resend   { messageId, organizationId }
```

Resets the message to `QUEUED` and clears `tries`, `lastTriedAt`, `error` and `messageId`. The sender cron picks it up on its next pass. This works even for a `COMPLETED` campaign, because message status is independent of campaign status.

The stored body is reused, so resending a message whose content was blanked by daily maintenance sends an empty email. See [maintenance.md](maintenance.md).
