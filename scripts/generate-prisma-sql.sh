#!/bin/bash

# Generates the Prisma client, including TypedSQL output (prisma/client/sql),
# inside a Docker build. `prisma generate --sql` needs a migrated database, so
# this installs Postgres, runs it on a temporary data dir, migrates, generates,
# then purges Postgres again. Run it in a single RUN so none of it lands in the
# image layers. Debian-based images only; needs root.

set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/../apps/backend" && pwd)"
PG_PORT=54329
PG_DATA="$(mktemp -d /tmp/prisma-sql-pg.XXXXXX)"

mkdir -p /etc/postgresql-common
echo "create_main_cluster = false" > /etc/postgresql-common/createcluster.conf

apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends postgresql

PG_BIN="$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -n 1)"

cleanup() {
  runuser -u postgres -- "$PG_BIN/pg_ctl" -D "$PG_DATA" -m fast stop >/dev/null 2>&1 || true
  rm -rf "$PG_DATA"
  DEBIAN_FRONTEND=noninteractive apt-get purge -y --auto-remove 'postgresql*' >/dev/null
  rm -rf /etc/postgresql /etc/postgresql-common /var/lib/postgresql /var/log/postgresql /var/run/postgresql
  userdel postgres >/dev/null 2>&1 || true
  rm -rf /var/lib/apt/lists/*
}
trap cleanup EXIT

chown postgres:postgres "$PG_DATA"
runuser -u postgres -- "$PG_BIN/initdb" -D "$PG_DATA" -U postgres --auth=trust >/dev/null
runuser -u postgres -- "$PG_BIN/pg_ctl" -D "$PG_DATA" -w \
  -o "-p $PG_PORT -k $PG_DATA -c listen_addresses=localhost" start

export DATABASE_URL="postgresql://postgres@localhost:$PG_PORT/postgres?schema=public"

cd "$BACKEND_DIR"
pnpm exec prisma migrate deploy
pnpm exec prisma generate --sql
