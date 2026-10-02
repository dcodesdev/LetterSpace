# Testing

The backend test suite: how to run it, how to write a test, and what CI does.

Everything lives in `apps/backend`. The other workspaces have no tests yet.

## Run the suite

```bash
pnpm test                        # Repo root, through Turbo
pnpm --filter backend test       # Backend only
```

Both need a running PostgreSQL that matches `DATABASE_URL` in
`apps/backend/.env.test`. Set that up first.

## Test database

Tests run against a real database. There is no in-memory substitute and Prisma
is never mocked.

The committed `apps/backend/.env.test` holds local defaults:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/letterspace_test?schema=public"
JWT_SECRET="my-secret-key"
```

Create the database once:

```bash
createdb letterspace_test
```

Or point `.env.test` at whatever you already run. Values already present in the
environment win — both `dotenv-cli` (the `test` scripts) and `dotenv`
(`tests/integration/helpers/setup.ts`) load the file without `override` — so you
can override per shell:

```bash
DATABASE_URL="postgresql://me@localhost:5432/my_test_db" pnpm --filter backend test
```

Migrations apply automatically: the vitest `globalSetup`
(`tests/integration/helpers/global-setup.ts`) runs `prisma migrate deploy` once
before any test file. You never need to migrate the test database by hand.

The suite drops all data before every test, so never point `DATABASE_URL` at a
database you care about.

## Running a subset

```bash
cd apps/backend

pnpm test:run tests/integration/trpc/list.test.ts   # One file
pnpm test:run tests/integration/trpc                # One directory
pnpm test:run -t "rejects a duplicate email"        # One test by name
pnpm test:watch                                     # Watch mode
```

## Isolation

One database is shared by the whole run, so:

- `setup.ts` calls `resetDb()` in `beforeEach`. Every test starts empty.
- `reset-db.ts` deletes every model children-first, so the deletes are FK-safe.
- `vitest.config.ts` sets `fileParallelism: false` and `sequence.concurrent: false`.
  Keep both — parallel files reset the database out from under each other.

Add a model to `prisma/schema.prisma` and you must add its `deleteMany()` to
`reset-db.ts`, in an order that deletes children before parents.

Tests create their own fixtures. Nothing survives from the seed script or from
the previous test.

## Writing an integration test

Import through the aliases (`@src`, `@tests`, `@helpers`, `@prisma-client`), not
relative paths.

### TRPC

```ts
import { createAuthedUser } from "@helpers/auth"
import { createList } from "@helpers/factories"
import { createCaller, expectTrpcError } from "@helpers/trpc"
import { describe, expect, it } from "vitest"

describe("list.get", () => {
  it("returns a list in the caller's organization", async () => {
    const { user, orgId } = await createAuthedUser()
    const list = await createList({ organizationId: orgId, name: "Weekly" })

    const result = await createCaller({ id: user.id }).list.get({ id: list.id })

    expect(result.name).toBe("Weekly")
  })

  it("requires auth", async () => {
    const { orgId } = await createAuthedUser()
    await expectTrpcError(
      createCaller().list.list({ organizationId: orgId }),
      "UNAUTHORIZED"
    )
  })
})
```

### REST

```ts
import { createAuthedUser } from "@helpers/auth"
import { request } from "@helpers/request"

const { apiKey } = await createAuthedUser()

const res = await request
  .get("/api/subscribers?page=1&perPage=10")
  .set("x-api-key", apiKey.key)

expect(res.status).toBe(200)
```

## Helpers

| Helper                  | Use                                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@helpers/factories`    | `createOrganization`, `createUser`, `createApiKey`, `createList`, `createSubscriber`, `createTemplate`, `createCampaign`, `createMessage`, `createWebhook`, `createWebhookLog` |
| `@helpers/auth`         | `createAuthedUser()` → `{ user, orgId, apiKey, token }`                                                                                                                        |
| `@helpers/trpc`         | `createCaller(user?)`, `createCallerFromToken(token?)`, `expectTrpcError(promise, code)`                                                                                       |
| `@helpers/request`      | Supertest client bound to the Express app                                                                                                                                      |
| `@helpers/fake-request` | Minimal `express.Request` stand-in for the webhook sandbox                                                                                                                     |
| `@helpers/wait-for`     | Polls an assertion until it passes                                                                                                                                             |

Factories take an options object and fill anything you omit with Faker data.
`createUser()` also builds an organization with general, email-delivery and SMTP
settings, and an API key.

`createCaller(user?)` injects the TRPC context directly — fastest, and enough for
most tests. `createCallerFromToken(token)` goes through the real `createContext`,
so use it when the assertion is about the token itself: expiry, tampering, or a
`pwdVersion` bump invalidating an old token.

`waitFor` exists because the tracking endpoints (`/t/:id`, `/img/:id/img.png`)
send their response before the database write finishes. Assert on those side
effects through `waitFor`, or the write leaks into the next test.

```ts
await waitFor(async () => {
  expect(await prisma.click.count()).toBe(1)
})
```

### Prisma omits

`src/utils/prisma.ts` globally omits `apiKey.key` and `user.password` /
`user.pwdVersion`. A factory or query that needs one has to opt back in:

```ts
prisma.apiKey.create({ data, omit: { key: false } })
```

## Unit tests

Unit tests are colocated as `src/**/*.test.ts` and picked up by the same config.
They still load `setup.ts`, so each one pays for a database reset it does not
need. Mock external services with `vi.mock` — `src/lib/Mailer.test.ts` mocks
`nodemailer` this way. Nothing in the suite sends real mail.

## CI

`.github/workflows/test.yaml` runs on every push and pull request:

1. Start a `postgres:16` service container.
2. `pnpm install --frozen-lockfile`, Node 22, pnpm cache.
3. `pnpm --filter backend migrate:deploy`, then `generate`. TypedSQL
   (`prisma generate --sql`) checks queries against the database, so it must be
   migrated first.
4. `pnpm --filter backend test:run`.

`DATABASE_URL` and `JWT_SECRET` come from the workflow `env` block, which
overrides the committed `.env.test`. `JWT_SECRET` reads the `TEST_JWT_SECRET`
repository secret and falls back to a literal for forks.

## Troubleshooting

**`Can't reach database server`** — Postgres is not running, or `DATABASE_URL`
in `.env.test` does not match your local role and password.

**Foreign key violations across unrelated tests** — file parallelism got
re-enabled. Check `fileParallelism: false` in `apps/backend/vitest.config.ts`.

**A new model's rows survive between tests** — add it to `reset-db.ts`.

**`ENOENT ... prisma/client/runtime/library.js.map`** — a missing sourcemap in
the generated client. Noisy, harmless.
