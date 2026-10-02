# Typed SQL

Raw SQL queries that Prisma TypedSQL turns into typed functions.

## Add or change a query

1. Edit or add a file in `apps/backend/prisma/sql/` (`countDbSize.sql`, `countDistinctRecipients.sql`, `countDistinctRecipientsInTimeRange.sql`, `subscriberGrowthQuery.sql`).
2. Regenerate:

   ```bash
   pnpm --filter backend migrate:dev
   pnpm --filter backend generate
   ```

3. Import the function from `prisma/client/sql` and run it with `prisma.$queryRawTyped(...)` — see `src/stats/query.ts`.

`generate` runs `prisma generate --sql`. It connects to `DATABASE_URL` (from `apps/backend/.env`) and introspects each query, so the database must be running and fully migrated.

## Generated, not committed

`apps/backend/prisma/client` is gitignored, including `prisma/client/sql`. Every place that builds the backend generates it:

| Where     | How                                                                              |
| --------- | -------------------------------------------------------------------------------- |
| Local dev | Turbo runs `generate` before `dev`, `build`, `check-types` and `test`            |
| CI        | `.github/workflows/test.yaml` runs `migrate:deploy`, then `generate`             |
| Docker    | `scripts/generate-prisma-sql.sh`, called from `Dockerfile` and `Dockerfile.node` |

The Docker builds have no database, so `scripts/generate-prisma-sql.sh` installs Postgres with apt, starts it on a temporary data dir (port 54329), runs `prisma migrate deploy` and `prisma generate --sql`, then stops and purges Postgres. It runs in a single `RUN`, so Postgres never lands in the image. Debian-based images only.

`apps/backend/entrypoint.sh` runs plain `prisma generate` at container start; that leaves `prisma/client/sql` in place.

## Troubleshooting

**`Can't reach database server` during `generate`** — Postgres is not running, or `DATABASE_URL` in `apps/backend/.env` is wrong. `.env.test` is not read by `generate`.

**`relation ... does not exist` during `generate`** — the database is behind. Run `pnpm --filter backend migrate:dev`.
