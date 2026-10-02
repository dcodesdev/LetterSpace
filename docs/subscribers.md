# Subscribers

A subscriber is one email address inside an organization. `(organizationId, email)` is unique.

## Create

```
POST /trpc/subscriber.create
{
  "email": "jane@example.com",
  "name": "Jane",
  "organizationId": "...",
  "listIds": ["list-id"],
  "emailVerified": false,
  "metadata": [{ "key": "plan", "value": "pro" }]
}
```

Returns `CONFLICT` if the email already exists in the organization, and `NOT_FOUND` if a list id does not belong to it. To upsert instead, use `POST /api/subscribers` ([rest-api.md](rest-api.md)).

## Update

`subscriber.update` takes the full desired state:

- `listIds` is a replacement set — lists missing from it are removed, new ones are added. New list ids must belong to the organization, or it returns `NOT_FOUND`.
- `metadata` is a replacement set too. Omit it to keep the existing metadata.

## Read

| Procedure         | Returns                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `subscriber.list` | Paginated subscribers with metadata and list membership; `search` matches name and email |
| `subscriber.get`  | One subscriber with lists, metadata, and the 10 most recent messages                     |

## Delete

`subscriber.delete` removes the subscriber. Messages, clicks, metadata and list memberships cascade away with it.

## Metadata

`SubscriberMetadata` is a key/value table, unique per `(subscriberId, key)`. `subscriber.create` and `subscriber.update` cap keys at 64 characters and values at 256.

Every key is available in email content as `{{subscriber.metadata.<key>}}`. See [placeholders.md](placeholders.md).

## Unsubscribing and verification

Membership is never deleted on unsubscribe — see [unsubscribes.md](unsubscribes.md), which also covers double opt-in and `subscriber.verifyEmail`.

## CSV import

`subscriber.import { file, organizationId, listId? }` takes a CSV with a header row. It is not wired to the dashboard.

- `email` is required on every row; a missing one is `BAD_REQUEST` `Missing email on row N`.
- `name` comes from a `name` column, or `first_name` + `last_name`. Other columns are ignored.
- A malformed file is `BAD_REQUEST` `Invalid CSV: <parser message>`.
- Rows are de-duplicated by email before saving; the last row wins. The returned `count` is the number of unique emails.
- Existing subscribers are updated in place, including `name` (set to null when the file has no name columns). With `listId`, each subscriber is added to that list; a `listId` from another organization returns `NOT_FOUND`.
