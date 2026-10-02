# Lists

A list groups subscribers. Campaigns send to lists, not to individual subscribers.

## Manage lists

| Procedure | Input | Notes |
| --- | --- | --- |
| `list.create` | `{ name, description?, organizationId }` | |
| `list.update` | `{ id, name, description? }` | |
| `list.delete` | `{ id }` | Cascades to `ListSubscriber` rows, not to subscribers |
| `list.list` | `{ organizationId, page, perPage, search? }` | `search` matches name and description, case-insensitive |
| `list.get` | `{ id }` | Includes every `ListSubscriber` with its subscriber |

`list.list` returns each list with `_count.ListSubscribers` counting only rows where `unsubscribedAt` is null, so the number shown is the active audience.

Pagination defaults to `page: 1`, `perPage: 10`, max `perPage: 100` (`apps/backend/src/utils/schemas.ts`).

## Membership

Membership lives in `ListSubscriber`, unique per `(listId, subscriberId)`. Unsubscribing sets `unsubscribedAt` instead of deleting the row, which keeps the history and the unsubscribe stats. See [unsubscribes.md](unsubscribes.md).

Attach subscribers to lists when you create or update them (`listIds` on `subscriber.create` / `subscriber.update`), or with `lists` on the REST endpoints in [rest-api.md](rest-api.md).

## Use in campaigns

Set `listIds` on `campaign.update`. A campaign sends one message per subscriber, deduplicated across all its lists, skipping anyone with `unsubscribedAt` set. See [campaigns.md](campaigns.md).
