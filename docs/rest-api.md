# REST API

`/api/*` manages subscribers from outside the dashboard. Interactive docs are served at `/docs` (Swagger UI), generated from the JSDoc in `apps/backend/src/api/server.ts`.

## Authentication

Create a key in **Settings → API Keys** (`settings.createApiKey { organizationId, name, expiresAt? }`). The key is shown once, in the form `sk_<64 hex chars>`.

Send it on every request:

```bash
curl https://your-host/api/subscribers \
  -H "x-api-key: sk_..."
```

A missing or unknown key returns 401. The key resolves to its organization, which scopes every endpoint. `lastUsed` is updated on each request.

`settings.listApiKeys` shows name, creation, expiry and last use — never the key itself. `settings.deleteApiKey { id, organizationId }` revokes one.

`expiresAt` is stored and displayed but is not checked during authentication; delete a key to revoke it.

## Endpoints

| Method | Path | Does |
| --- | --- | --- |
| `POST` | `/api/subscribers` | Create or update a subscriber by email |
| `GET` | `/api/subscribers` | List subscribers, paginated |
| `GET` | `/api/subscribers/:id` | One subscriber |
| `PUT` | `/api/subscribers/:id` | Update a subscriber |
| `DELETE` | `/api/subscribers/:id` | Delete a subscriber |

### Create or update

```bash
curl -X POST https://your-host/api/subscribers \
  -H "x-api-key: sk_..." \
  -H "content-type: application/json" \
  -d '{
    "email": "jane@example.com",
    "name": "Jane",
    "lists": ["list-id"],
    "doubleOptIn": true,
    "metadata": { "plan": "pro" }
  }'
```

`email` and at least one list id are required; unknown list ids return 400. This is the endpoint to point a signup form at.

An existing subscriber with the same email is updated, and the given lists are merged with the ones they already had. `metadata` replaces all existing metadata for the subscriber.

With `doubleOptIn: true` the subscriber is stored unverified and a verification email goes out; see [unsubscribes.md](unsubscribes.md). Returns 422 if SMTP settings, `baseURL` or a sender address are missing.

Responds 201 with `{ id, email, name, lists, metadata, emailVerified, createdAt, updatedAt }`.

### List

```bash
curl "https://your-host/api/subscribers?page=1&perPage=100&emailEquals=jane@example.com" \
  -H "x-api-key: sk_..."
```

Query parameters: `page` (default 1), `perPage` (default 100), `emailEquals`, `nameEquals` — both exact matches. Returns `{ data, pagination: { total, page, perPage, totalPages, hasMore } }`, newest first.

### Update

`PUT /api/subscribers/:id` accepts `email`, `name`, `lists`, `metadata` and `emailVerified`, all optional. Unlike create, `lists` **replaces** the subscriber's memberships rather than merging. Unknown ids return 404.

### Delete

`DELETE /api/subscribers/:id` returns `{ "success": true }`. Messages, clicks and metadata cascade.

## Everything else

Lists, campaigns, templates and settings have no REST endpoints. Use the tRPC router at `/trpc/*` with a bearer token from [accounts.md](accounts.md).
